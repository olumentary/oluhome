'use client';

import { useState, useTransition } from 'react';
import { User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { updateProfile, changePassword } from '@/app/(dashboard)/actions';

interface ProfileSectionProps {
  userName: string;
  userEmail: string;
}

export function ProfileSection({ userName, userEmail }: ProfileSectionProps) {
  const [name, setName] = useState(userName);
  const [isPending, startTransition] = useTransition();

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPwPending, startPwTransition] = useTransition();

  function handleSaveProfile() {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    startTransition(async () => {
      try {
        await updateProfile({ name: name.trim() });
        toast.success('Profile updated');
      } catch {
        toast.error('Failed to update profile');
      }
    });
  }

  function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    startPwTransition(async () => {
      const result = await changePassword({ currentPassword, newPassword });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Password changed');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Profile</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Name + Email */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={userEmail} disabled />
            <p className="text-xs text-muted-foreground">
              Contact support to change your email address.
            </p>
          </div>
        </div>
        <Button onClick={handleSaveProfile} disabled={isPending} size="sm">
          {isPending ? 'Saving...' : 'Save Profile'}
        </Button>

        {/* Password */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Change Password</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={isPwPending}
            variant="outline"
            size="sm"
          >
            {isPwPending ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
