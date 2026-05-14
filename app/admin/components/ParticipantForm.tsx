'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface ParticipantFormProps {
  teams: string[];
  onAddParticipant: (name: string, team: string) => Promise<void>;
}

export default function ParticipantForm({ teams, onAddParticipant }: ParticipantFormProps) {
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!name.trim() || !team) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      await onAddParticipant(name.trim(), team);
      toast.success('Participant added', {
        description: `${name} from ${team} has been added.`,
      });
      setName('');
      setTeam('');
    } catch (error) {
      toast.error('Failed to add participant');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card className="bg-zinc-900/50 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-emerald-500" />
            Add Participant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">Name</Label>
              <Input
                id="name"
                placeholder="Enter participant name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team" className="text-zinc-300">Team</Label>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger className="bg-zinc-800/50 border-white/10 text-white">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-white/10">
                  {teams.map((c) => (
                    <SelectItem 
                      key={c} 
                      value={c}
                      className="text-white hover:bg-zinc-700"
                    >
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-white/10" />

            <Button
              type="submit"
              disabled={isLoading || !name.trim() || !team}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isLoading ? 'Adding...' : 'Add Participant'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
