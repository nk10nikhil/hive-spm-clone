import { useState } from 'react'
import { User, Code, X } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ProfileSettings } from './ProfileSettings'
import { DeveloperSettings } from './DeveloperSettings'

type SettingsTab = 'profile' | 'developers'

const menuItems: { id: SettingsTab; title: string; icon: typeof User }[] = [
  { id: 'profile', title: 'Profile', icon: User },
  { id: 'developers', title: 'Developers', icon: Code },
]

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 [&>button:last-child]:hidden rounded-2xl overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-52 flex-shrink-0 border-r bg-background p-4">
            <DialogHeader className="mb-6">
              <DialogClose className="w-fit p-1.5 rounded-md opacity-70 hover:opacity-100 hover:bg-accent transition-opacity">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogClose>
              <DialogTitle className="sr-only">Settings</DialogTitle>
            </DialogHeader>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-left',
                    'hover:bg-accent transition-colors',
                    activeTab === item.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-6 pt-10 bg-muted/30">
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'developers' && <DeveloperSettings />}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}
