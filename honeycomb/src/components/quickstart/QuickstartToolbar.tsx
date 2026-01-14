import { Copy, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SdkLanguage, AgentFramework } from '@/types/quickstart'

interface QuickstartToolbarProps {
  languages: SdkLanguage[]
  frameworks: AgentFramework[]
  selectedLanguage: string
  selectedFramework: string
  onLanguageChange: (value: string) => void
  onFrameworkChange: (value: string) => void
  onCopyAll: () => void
  onDownload: () => void
  isCopyDisabled: boolean
  isDownloadDisabled: boolean
}

export function QuickstartToolbar({
  languages,
  frameworks,
  selectedLanguage,
  selectedFramework,
  onLanguageChange,
  onFrameworkChange,
  onCopyAll,
  onDownload,
  isCopyDisabled,
  isDownloadDisabled,
}: QuickstartToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Select value={selectedLanguage} onValueChange={onLanguageChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.id} value={lang.id}>
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedFramework} onValueChange={onFrameworkChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Framework" />
          </SelectTrigger>
          <SelectContent>
            {frameworks.map((fw) => (
              <SelectItem key={fw.id} value={fw.id}>
                {fw.name === 'Generic' ? 'General' : fw.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onCopyAll}
          disabled={isCopyDisabled}
        >
          <Copy className="h-4 w-4" />
          <span className="sr-only">Copy all code</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onDownload}
          disabled={isDownloadDisabled}
        >
          <Download className="h-4 w-4" />
          <span className="sr-only">Download</span>
        </Button>
      </div>
    </div>
  )
}
