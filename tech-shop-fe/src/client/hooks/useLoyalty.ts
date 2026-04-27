import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getLoyaltySummary,
  redeemPoints as redeemPointsSvc
} from '../services/loyaltyService'

export const useLoyaltySummary = () =>
  useQuery({
    queryKey: ['loyalty', 'summary'],
    queryFn: getLoyaltySummary,
    staleTime: 2 * 60 * 1000
  })

export const useRedeemPoints = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: redeemPointsSvc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty', 'summary'] })
    }
  })
}

// Tier config
export const TIERS = [
  {
    key: 'BRONZE',
    label: 'Bronze',
    min: 0,
    max: 499,
    color: 'text-orange-700',
    bg: 'bg-orange-100',
    border: 'border-orange-300',
    bar: 'bg-orange-400'
  },
  {
    key: 'SILVER',
    label: 'Silver',
    min: 500,
    max: 1999,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    bar: 'bg-slate-400'
  },
  {
    key: 'GOLD',
    label: 'Gold',
    min: 2000,
    max: 4999,
    color: 'text-yellow-700',
    bg: 'bg-yellow-100',
    border: 'border-yellow-300',
    bar: 'bg-yellow-400'
  },
  {
    key: 'PLATINUM',
    label: 'Platinum',
    min: 5000,
    max: Infinity,
    color: 'text-purple-700',
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    bar: 'bg-purple-500'
  }
]

export const getTierInfo = (points: number) => {
  return (
    TIERS.find(t => points >= t.min && points <= t.max) ?? TIERS[0]
  )
}

export const getNextTier = (points: number) => {
  const idx = TIERS.findIndex(t => points >= t.min && points <= t.max)
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null
}
