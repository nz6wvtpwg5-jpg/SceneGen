'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Show } from '@/types/show';
import { formatCurrency } from '@/lib/csv/parser';
import { toast } from 'sonner';
import { Calendar, Clock, MapPin, DollarSign, Users, Phone, Mail, Save, X } from 'lucide-react';

interface DaySheetModalProps {
  show: Show;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedShow: Partial<Show>) => Promise<void>;
}

export function DaySheetModal({ show, isOpen, onClose, onSave }: DaySheetModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    venueName: show.venueName,
    venueAddress: show.venueAddress,
    venueCity: show.venueCity,
    venueState: show.venueState,
    venueCapacity: show.venueCapacity || '',
    doorsTime: show.doorsTime,
    showTime: show.showTime,
    setLength: show.setLength,
    guarantee: show.guarantee || '',
    contactName: show.contactName,
    contactPhone: show.contactPhone,
    contactEmail: show.contactEmail,
    notes: show.notes || '',
  });

  const handleSave = async () => {
    if (!onSave) return;

    try {
      setIsSaving(true);
      await onSave({
        venueName: formData.venueName,
        venueAddress: formData.venueAddress,
        venueCity: formData.venueCity,
        venueState: formData.venueState,
        venueCapacity: formData.venueCapacity ? Number(formData.venueCapacity) : undefined,
        doorsTime: formData.doorsTime,
        showTime: formData.showTime,
        setLength: formData.setLength,
        guarantee: formData.guarantee ? Number(formData.guarantee) : undefined,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        notes: formData.notes,
      });
      setIsEditing(false);
      toast.success('Day sheet updated successfully!');
    } catch (error) {
      toast.error('Failed to update day sheet');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center justify-between">
            <span>Day Sheet</span>
            {onSave && (
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-semantic-success hover:bg-semantic-success/80"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Date */}
          <div className="flex items-center gap-3 p-4 bg-accent-cyan/10 rounded-lg">
            <Calendar className="h-5 w-5 text-accent-cyan" />
            <div>
              <p className="text-sm text-text-secondary">Date</p>
              <p className="font-semibold text-lg">{formatDate(show.showDate)}</p>
            </div>
          </div>

          {/* Venue Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent-purple" />
              Venue Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venueName">Venue Name</Label>
                {isEditing ? (
                  <Input
                    id="venueName"
                    value={formData.venueName}
                    onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-text-primary">{show.venueName || show.venueCity || 'Venue TBC'}</p>
                )}
              </div>

              <div>
                <Label htmlFor="venueCapacity">Venue Capacity</Label>
                {isEditing ? (
                  <Input
                    id="venueCapacity"
                    type="number"
                    value={formData.venueCapacity}
                    onChange={(e) => setFormData({ ...formData, venueCapacity: e.target.value })}
                    placeholder="e.g., 500"
                  />
                ) : (
                  <p className="mt-1 text-text-primary">
                    {show.venueCapacity ? show.venueCapacity.toLocaleString() : 'TBC'}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="venueAddress">Address</Label>
              {isEditing ? (
                <Input
                  id="venueAddress"
                  value={formData.venueAddress}
                  onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                />
              ) : (
                <p className="mt-1 text-text-primary">{show.venueAddress || [show.venueCity, show.venueState, show.venueCountry].filter(Boolean).join(', ') || 'Address TBC'}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venueCity">City</Label>
                {isEditing ? (
                  <Input
                    id="venueCity"
                    value={formData.venueCity}
                    onChange={(e) => setFormData({ ...formData, venueCity: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-text-primary">{show.venueCity}</p>
                )}
              </div>

              <div>
                <Label htmlFor="venueState">State</Label>
                {isEditing ? (
                  <Input
                    id="venueState"
                    value={formData.venueState}
                    onChange={(e) => setFormData({ ...formData, venueState: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-text-primary">{show.venueState}</p>
                )}
              </div>
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent-cyan" />
              Timing
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="doorsTime">Doors</Label>
                {isEditing ? (
                  <Input
                    id="doorsTime"
                    type="time"
                    value={formData.doorsTime}
                    onChange={(e) => setFormData({ ...formData, doorsTime: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-text-primary">{show.doorsTime}</p>
                )}
              </div>

              <div>
                <Label htmlFor="showTime">Show</Label>
                {isEditing ? (
                  <Input
                    id="showTime"
                    type="time"
                    value={formData.showTime}
                    onChange={(e) => setFormData({ ...formData, showTime: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-text-primary">{show.showTime}</p>
                )}
              </div>

              <div>
                <Label htmlFor="setLength">Set Length</Label>
                {isEditing ? (
                  <Input
                    id="setLength"
                    value={formData.setLength}
                    onChange={(e) => setFormData({ ...formData, setLength: e.target.value })}
                    placeholder="e.g., 90 min"
                  />
                ) : (
                  <p className="mt-1 text-text-primary">{show.setLength || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Financial */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-semantic-success" />
              Financial
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guarantee">Guarantee</Label>
                {isEditing ? (
                  <Input
                    id="guarantee"
                    type="number"
                    value={formData.guarantee}
                    onChange={(e) => setFormData({ ...formData, guarantee: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-semantic-success font-semibold text-lg">
                    {show.guarantee
                      ? show.currency
                        ? formatCurrency(show.guarantee, show.currency)
                        : `${show.guarantee.toFixed(2)} (currency not set)`
                      : 'N/A'}
                  </p>
                )}
              </div>

              <div>
                <Label>Deal Type</Label>
                <p className="mt-1 text-text-primary capitalize">
                  {show.dealType.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-accent-purple" />
              Contact Information
            </h3>

            <div className="space-y-3">
              <div>
                <Label htmlFor="contactName">Name</Label>
                {isEditing ? (
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-text-primary">{show.contactName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPhone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  {isEditing ? (
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    />
                  ) : (
                    <p className="mt-1 text-text-primary">{show.contactPhone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contactEmail" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  {isEditing ? (
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    />
                  ) : (
                    <p className="mt-1 text-text-primary">{show.contactEmail}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            {isEditing ? (
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Additional notes..."
              />
            ) : (
              <p className="mt-1 text-text-primary whitespace-pre-wrap">
                {show.notes || 'No notes'}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
