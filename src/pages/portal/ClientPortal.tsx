import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ClientPortal() {
  return (
    <div className="min-h-screen bg-brand-cream p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="heading-serif text-3xl font-bold">Your Rustic Retreat</h1>
          <Button>Contact Admin</Button>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent>
              <h2 className="heading-serif text-xl font-semibold">Checklist</h2>
              <p className="mt-2 text-sm text-[var(--brand-text)]/70">Track planning tasks and due dates.</p>
              <div className="mt-4">
                <Button variant="secondary">Open Checklist</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h2 className="heading-serif text-xl font-semibold">Guests</h2>
              <p className="mt-2 text-sm text-[var(--brand-text)]/70">Manage RVs, tents, and reception attendees.</p>
              <div className="mt-4">
                <Button variant="secondary">Manage Guests</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h2 className="heading-serif text-xl font-semibold">Documents</h2>
              <p className="mt-2 text-sm text-[var(--brand-text)]/70">Contracts, vendor info, timelines, and floor plans.</p>
              <div className="mt-4">
                <Button variant="secondary">View Documents</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

