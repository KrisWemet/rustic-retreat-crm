#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
container="rr-crm-test-$$"
workdir="$(mktemp -d)"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$workdir"
}
trap cleanup EXIT

docker run -d --name "$container" -e POSTGRES_PASSWORD=test postgres:16 >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" pg_isready -U postgres >/dev/null
docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres < supabase/tests/bootstrap.sql > "$workdir/bootstrap.log"
for migration in supabase/migrations/*.sql; do
  docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres < "$migration" > "$workdir/migration.log"
done
for fixture in permissions financial_reminders steps_5_7_integration intake_idempotency all_steps_integration concurrent_booking_setup concurrent_receipts_setup; do
  docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres < "supabase/tests/$fixture.sql" > "$workdir/$fixture.log"
done

docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres < supabase/tests/concurrent_booking_a.sql > "$workdir/race-a.log" 2>&1 &
race_a=$!
docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres < supabase/tests/concurrent_booking_b.sql > "$workdir/race-b.log" 2>&1 &
race_b=$!
successes=0
if wait "$race_a"; then successes=$((successes + 1)); fi
if wait "$race_b"; then successes=$((successes + 1)); fi
if [ "$successes" -ne 1 ]; then
  cat "$workdir/race-a.log" "$workdir/race-b.log"
  echo "Expected exactly one simultaneous booking to succeed; got $successes" >&2
  exit 1
fi
count=$(docker exec "$container" psql -At -U postgres -c "select count(*) from public.bookings where start_date = '2027-06-25'")
if [ "$count" != "1" ]; then
  echo "Expected one booking row after the race; got $count" >&2
  exit 1
fi
docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres < supabase/tests/concurrent_receipt.sql > "$workdir/receipt-a.log" 2>&1 &
receipt_a=$!
docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U postgres < supabase/tests/concurrent_receipt.sql > "$workdir/receipt-b.log" 2>&1 &
receipt_b=$!
wait "$receipt_a"
wait "$receipt_b"
total=$(docker exec "$container" psql -At -U postgres -c "select paid_cents from public.booking_payment_items where id = '40000000-0000-0000-0000-000000000099'")
if [ "$total" != "6000" ]; then
  echo "Concurrent receipts lost a payment: expected 6000, got $total" >&2
  exit 1
fi
echo "Database checks passed: all seven steps, access, finances, reminders, duplicate intake, concurrent bookings and receipts."
