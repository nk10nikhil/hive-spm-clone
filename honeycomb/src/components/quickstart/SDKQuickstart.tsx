import { useState, useEffect, useMemo, useCallback } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useQuickstartOptions,
  useGenerateQuickstart,
} from '@/hooks/queries/useQuickstart'
import { useNotificationStore } from '@/stores/notificationStore'
import {
  extractCodeBlocks,
  copyToClipboard,
  downloadAsFile,
} from '@/lib/quickstart'
import { QuickstartToolbar } from './QuickstartToolbar'
import { MarkdownRenderer } from './MarkdownRenderer'
import { AgentStatusIndicator } from './AgentStatusIndicator'
import type { AgentFramework } from '@/types/quickstart'

export function SDKQuickstart() {
  const [selectedLanguage, setSelectedLanguage] = useState('python')
  const [selectedFramework, setSelectedFramework] = useState('')

  const addNotification = useNotificationStore((s) => s.addNotification)

  const {
    data: options,
    isLoading: optionsLoading,
    error: optionsError,
  } = useQuickstartOptions()

  const generateMutation = useGenerateQuickstart()

  // Filter frameworks by language support
  const availableFrameworks = useMemo<AgentFramework[]>(() => {
    if (!options?.agentFrameworks) return []
    return options.agentFrameworks.filter((fw) =>
      selectedLanguage === 'python' ? fw.pythonSupport : fw.typescriptSupport
    )
  }, [options, selectedLanguage])

  // Auto-select first framework when options load or language changes
  useEffect(() => {
    if (availableFrameworks.length > 0 && !selectedFramework) {
      setSelectedFramework(availableFrameworks[0].id)
    }
  }, [availableFrameworks, selectedFramework])

  // Generate docs
  const generateDocs = useCallback(() => {
    if (!selectedFramework) return
    generateMutation.mutate({
      agentFramework: selectedFramework,
      sdkLanguage: selectedLanguage,
    })
  }, [selectedFramework, selectedLanguage, generateMutation])

  // Auto-generate on initial load and when selections change
  useEffect(() => {
    if (selectedFramework && options) {
      generateDocs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFramework, selectedLanguage])

  // Handle language change
  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      setSelectedLanguage(newLanguage)

      // Check if current framework supports new language
      const newFrameworks = options?.agentFrameworks?.filter((fw) =>
        newLanguage === 'python' ? fw.pythonSupport : fw.typescriptSupport
      )
      const frameworkStillValid = newFrameworks?.some(
        (fw) => fw.id === selectedFramework
      )

      if (!frameworkStillValid) {
        // Will auto-select via useEffect
        setSelectedFramework('')
      }
    },
    [options, selectedFramework]
  )

  // Handle framework change
  const handleFrameworkChange = useCallback((frameworkId: string) => {
    setSelectedFramework(frameworkId)
  }, [])

  // Copy all code blocks
  const handleCopyAll = useCallback(async () => {
    if (!generateMutation.data?.markdown) return

    const codeBlocks = extractCodeBlocks(generateMutation.data.markdown)
    if (codeBlocks.length === 0) {
      addNotification({
        type: 'warning',
        title: 'No code to copy',
        message: 'No code blocks found in the documentation',
      })
      return
    }

    const success = await copyToClipboard(codeBlocks.join('\n\n'))
    if (success) {
      addNotification({
        type: 'success',
        title: 'Copied',
        message: 'All code blocks copied to clipboard',
      })
    }
  }, [generateMutation.data, addNotification])

  // Download markdown
  const handleDownload = useCallback(() => {
    if (!generateMutation.data?.markdown) return

    const filename = `aden-sdk-quickstart-${selectedFramework}-${selectedLanguage}.md`
    downloadAsFile(generateMutation.data.markdown, filename)
  }, [generateMutation.data, selectedFramework, selectedLanguage])

  // Error state
  if (optionsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SDK Quickstart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">
              Failed to load quickstart options
            </p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Loading state
  if (optionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SDK Quickstart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-40" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const markdown = generateMutation.data?.markdown
  const tokenName = generateMutation.data?.metadata?.tokenName
  const codeBlocks = markdown ? extractCodeBlocks(markdown) : []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>SDK Quickstart</CardTitle>
        <AgentStatusIndicator />
      </CardHeader>
      <CardContent className="space-y-4">
        {options && (
          <QuickstartToolbar
            languages={options.sdkLanguages}
            frameworks={availableFrameworks}
            selectedLanguage={selectedLanguage}
            selectedFramework={selectedFramework}
            onLanguageChange={handleLanguageChange}
            onFrameworkChange={handleFrameworkChange}
            onCopyAll={handleCopyAll}
            onDownload={handleDownload}
            isCopyDisabled={
              codeBlocks.length === 0 || generateMutation.isPending
            }
            isDownloadDisabled={!markdown || generateMutation.isPending}
          />
        )}

        {/* Token info */}
        {tokenName && (
          <p className="text-sm text-muted-foreground">
            Using API Key: <span className="font-medium">{tokenName}</span>
          </p>
        )}

        {/* Generation error */}
        {generateMutation.isError && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
            <p className="mb-2">Failed to generate documentation</p>
            <Button variant="outline" size="sm" onClick={generateDocs}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading overlay */}
        {generateMutation.isPending && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">
              Generating documentation...
            </span>
          </div>
        )}

        {/* Rendered markdown */}
        {markdown && !generateMutation.isPending && (
          <MarkdownRenderer content={markdown} />
        )}
      </CardContent>
    </Card>
  )
}
