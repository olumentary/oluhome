'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function WaitlistForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Curiolu</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration is currently closed</CardTitle>
          <CardDescription>
            Join the waitlist and we&apos;ll let you know when spots open up
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              Thanks! We&apos;ll be in touch when registration opens.
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="waitlist-email">Email</Label>
                <Input
                  id="waitlist-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Join the waitlist
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
