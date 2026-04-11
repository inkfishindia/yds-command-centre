// UTMBuilder.tsx
// This file is assumed to be part of a larger app context.
// Only imports are updated to reflect the new UI component structure.

import React from 'react'
import { Card, Input, Button } from '../ui'
import { useClipboard } from '../hooks/useClipboard'

interface UTMBuilderProps {
  // Define props if any
}

const UTMBuilder: React.FC<UTMBuilderProps> = () => {
  const [websiteUrl, setWebsiteUrl] = React.useState('')
  const [utmSource, setUtmSource] = React.useState('')
  const [utmMedium, setUtmMedium] = React.useState('')
  const [utmCampaign, setUtmCampaign] = React.useState('')
  const [utmContent, setUtmContent] = React.useState('')
  const [utmTerm, setUtmTerm] = React.useState('')

  const { copy, isCopied } = useClipboard()

  const generatedUrl = React.useMemo(() => {
    if (!websiteUrl) return ''

    const params = new URLSearchParams()
    if (utmSource) params.append('utm_source', utmSource)
    if (utmMedium) params.append('utm_medium', utmMedium)
    if (utmCampaign) params.append('utm_campaign', utmCampaign)
    if (utmContent) params.append('utm_content', utmContent)
    if (utmTerm) params.append('utm_term', utmTerm)

    const queryString = params.toString()
    return queryString ? `${websiteUrl}?${queryString}` : websiteUrl
  }, [websiteUrl, utmSource, utmMedium, utmCampaign, utmContent, utmTerm])

  return (
    <Card title="UTM Link Builder">
      <div className="space-y-4">
        <Input
          label="Website URL"
          placeholder="https://yourdesignstore.in"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          required
        />
        <Input
          label="UTM Source"
          placeholder="facebook, google, newsletter"
          value={utmSource}
          onChange={(e) => setUtmSource(e.target.value)}
        />
        <Input
          label="UTM Medium"
          placeholder="cpc, banner, email"
          value={utmMedium}
          onChange={(e) => setUtmMedium(e.target.value)}
        />
        <Input
          label="UTM Campaign"
          placeholder="summer_sale, product_launch"
          value={utmCampaign}
          onChange={(e) => setUtmCampaign(e.target.value)}
        />
        <Input
          label="UTM Content (Optional)"
          placeholder="logo_link, sidebar_banner"
          value={utmContent}
          onChange={(e) => setUtmContent(e.target.value)}
        />
        <Input
          label="UTM Term (Optional)"
          placeholder="running+shoes, mens+hats"
          value={utmTerm}
          onChange={(e) => setUtmTerm(e.target.value)}
        />

        <div className="pt-4">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Generated URL</label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={generatedUrl}
              readOnly
              className="flex-grow min-w-[150px]"
              aria-label="Generated UTM URL"
            />
            <Button
              onClick={() => copy(generatedUrl)}
              disabled={!generatedUrl}
              variant={isCopied ? 'secondary' : 'primary'}
              size="md"
              title={isCopied ? 'Copied!' : 'Copy to clipboard'}
            >
              {isCopied ? <span role="img" aria-label="check" className="leading-none">✅</span> : <span role="img" aria-label="clipboard" className="leading-none">📋</span>}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default UTMBuilder