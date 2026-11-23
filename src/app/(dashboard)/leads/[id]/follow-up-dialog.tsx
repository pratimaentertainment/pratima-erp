'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createFollowUp } from '@/actions/follow-up.actions';
import { toast } from 'sonner';

export function FollowUpDialog({ leadId, onClose }: { leadId: string, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'CALL',
    followUpDate: '',
    followUpTime: '',
    reminderDate: '',
    reminderTime: '',
    priority: 'MEDIUM',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string | null | undefined) => {
    if (value) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.followUpDate || !formData.followUpTime) {
        throw new Error('Follow-up date and time are required');
      }

      const dateTime = new Date(`${formData.followUpDate}T${formData.followUpTime}`);
      let remDateTime = null;
      
      if (formData.reminderDate && formData.reminderTime) {
        remDateTime = new Date(`${formData.reminderDate}T${formData.reminderTime}`);
      }

      const payload = {
        leadId,
        type: formData.type,
        priority: formData.priority,
        notes: formData.notes,
        followUpDate: dateTime.toISOString(),
        reminderDate: remDateTime ? remDateTime.toISOString() : null,
      };

      const result = await createFollowUp(payload);
      
      if (result.success) {
        toast.success('Follow-up scheduled successfully');
        onClose();
      } else {
        toast.error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule follow-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle>Schedule Follow-Up</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(val) => handleSelectChange('type', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">Call</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="VIDEO_CALL">Video Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(val) => handleSelectChange('priority', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" name="followUpTime" value={formData.followUpTime} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reminder Date (Optional)</Label>
                <Input type="date" name="reminderDate" value={formData.reminderDate} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Reminder Time (Optional)</Label>
                <Input type="time" name="reminderTime" value={formData.reminderTime} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange} 
                placeholder="Details for this follow-up..." 
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule Follow-Up'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
