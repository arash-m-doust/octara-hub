import { useEffect, useState } from 'react'
import { fileApi } from '@/api/files'
import { toast } from '@/components/ui/Toast'

interface UseOfficePreviewOptions {
  previewPath: string | null
}

export function useOfficePreview({ previewPath }: UseOfficePreviewOptions) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl)
      }
    }
  }, [previewObjectUrl])

  const openPreview = async () => {
    if (!previewPath) {
      toast.info('Preview unavailable. Download the file to view it.')
      return
    }

    setPreviewLoading(true)
    try {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl)
      }
      const blob = await fileApi.previewBlob(previewPath)
      const objectUrl = URL.createObjectURL(blob)
      setPreviewObjectUrl(objectUrl)
      setPreviewOpen(true)
    } catch {
      toast.error('Preview failed. Download the file to view it.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    setPreviewOpen(false)
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl)
      setPreviewObjectUrl(null)
    }
  }

  return {
    previewOpen,
    previewLoading,
    previewObjectUrl,
    openPreview,
    closePreview,
  }
}

