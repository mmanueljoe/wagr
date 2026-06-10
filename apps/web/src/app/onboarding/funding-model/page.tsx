'use client'

import { Button } from '@/components/ui/button'
import { useSetFundingModel } from '@/hooks/use-set-funding-model'
import { cn } from '@/lib/utils'
import type { FundingModel } from '@wagr/types'
import { Check, Wallet, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ModelOption {
  id: FundingModel
  icon: typeof Wallet
  title: string
  oneLiner: string
  details: string[]
}

const OPTIONS: ModelOption[] = [
  {
    id: 'model1',
    icon: Wallet,
    title: 'I’ll fund a float upfront',
    oneLiner: 'You top up Wagr first. Worker advances come out of your float.',
    details: [
      'You stay in control of how much cash is available.',
      'No extra cost — you’re only moving money you’d pay on payday.',
      'You’ll be asked to top up your float right after this step.',
    ],
  },
  {
    id: 'model2',
    icon: Zap,
    title: 'Let Wagr front the cash',
    oneLiner: 'Wagr advances workers from our capital. You repay on payday.',
    details: [
      'No upfront cash from you. Start letting workers request right away.',
      'Wagr recovers what we advanced + a small service fee on your next payday.',
      'Best if you want to offer Wagr without tying up cash today.',
    ],
  },
]

export default function FundingModelPage() {
  const router = useRouter()
  const setFundingModel = useSetFundingModel()
  const [selected, setSelected] = useState<FundingModel | null>(null)

  function onContinue() {
    if (!selected) return
    setFundingModel.mutate(selected, {
      onSuccess: () => router.push('/dashboard'),
    })
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-heading text-wagr-navy mb-2">
        How do you want to fund advances?
      </h1>
      <p className="text-sm text-wagr-gray mb-8">
        Pick whichever fits your business. You can change this later from settings.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {OPTIONS.map((option) => (
          <ModelCard
            key={option.id}
            option={option}
            isSelected={selected === option.id}
            onSelect={() => setSelected(option.id)}
          />
        ))}
      </div>

      {setFundingModel.error && (
        <p className="text-sm text-destructive mb-4" role="alert">
          {setFundingModel.error.message}
        </p>
      )}

      <Button
        onClick={onContinue}
        disabled={!selected || setFundingModel.isPending}
        className="w-full md:w-auto md:min-w-48"
      >
        {setFundingModel.isPending ? 'Saving…' : 'Continue'}
      </Button>
    </div>
  )
}

interface ModelCardProps {
  option: ModelOption
  isSelected: boolean
  onSelect: () => void
}

function ModelCard({ option, isSelected, onSelect }: ModelCardProps) {
  const Icon = option.icon
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        'text-left p-6 rounded-wagr-lg border-2 transition',
        'hover:border-wagr-navy/40 focus:outline-none focus:ring-2 focus:ring-wagr-navy',
        isSelected ? 'border-wagr-navy bg-wagr-navy/5' : 'border-wagr-gray-light bg-wagr-white',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="h-9 w-9 rounded-wagr bg-wagr-navy/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-wagr-navy" />
        </div>
        {isSelected && (
          <div className="h-6 w-6 rounded-full bg-wagr-navy flex items-center justify-center">
            <Check className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
      <h2 className="text-base font-medium text-wagr-black mb-1">{option.title}</h2>
      <p className="text-sm text-wagr-gray mb-4">{option.oneLiner}</p>
      <ul className="space-y-2">
        {option.details.map((detail) => (
          <li key={detail} className="text-xs text-wagr-black/80 flex gap-2">
            <span aria-hidden className="text-wagr-navy">
              •
            </span>
            <span>{detail}</span>
          </li>
        ))}
      </ul>
    </button>
  )
}
