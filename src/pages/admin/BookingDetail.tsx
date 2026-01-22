import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, BadgeDollarSign } from 'lucide-react'

export default function BookingDetail() {
  return (
    <div className="min-h-screen bg-brand-cream p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="heading-serif text-3xl font-bold">Booking Overview</h1>
          <p className="mt-1 text-sm text-[var(--brand-text)]/70">Rustic Retreat — High-level details and actions</p>
        </div>
        <Button>Edit Booking</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-[var(--brand-text)]">
              <Calendar className="h-5 w-5" />
              <div>
                <div className="text-sm text-[var(--brand-text)]/70">Dates</div>
                <div className="font-semibold">Wed 12 Aug — Mon 17 Aug (5-Day)</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-[var(--brand-text)]">
              <Users className="h-5 w-5" />
              <div>
                <div className="text-sm text-[var(--brand-text)]/70">Guests</div>
                <div className="font-semibold">80 Reception · 45 Camping</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-[var(--brand-text)]">
              <BadgeDollarSign className="h-5 w-5" />
              <div>
                <div className="text-sm text-[var(--brand-text)]/70">Financial</div>
                <div className="font-semibold">Deposit received · Final due in 60 days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent>
            <h2 className="heading-serif text-xl font-semibold">Timeline</h2>
            <div className="mt-3 space-y-2 text-sm text-[var(--brand-text)]/80">
              <div>• Contract signed — Jan 5</div>
              <div>• Deposit received — Jan 7</div>
              <div>• Tour completed — Jan 12</div>
              <div>• Final payment reminder scheduled — Jun 10</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="heading-serif text-xl font-semibold">Notes</h2>
            <div className="relative mt-3 rounded-xl border border-[var(--brand-accent)] bg-[var(--brand-cream)] p-4">
              <span className="pointer-events-none absolute -top-5 left-4 text-6xl font-serifDisplay text-[var(--brand-accent)]/70">“</span>
              <p className="relative whitespace-pre-line text-[var(--brand-text)]">
                Couple prefer Thursday start; RVs arriving staggered; Pets allowed with fee.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

