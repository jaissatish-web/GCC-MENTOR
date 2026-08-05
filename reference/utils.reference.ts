import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility to merge Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date for display
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Format currency in INR
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Gulf countries list
export const GULF_COUNTRIES = [
  { value: 'UAE',          label: 'United Arab Emirates (UAE)' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia (KSA)' },
  { value: 'Qatar',        label: 'Qatar' },
  { value: 'Kuwait',       label: 'Kuwait' },
  { value: 'Oman',         label: 'Oman' },
  { value: 'Bahrain',      label: 'Bahrain' },
]

// All work disciplines (engineering + management + technical + admin)
export const WORK_DISCIPLINES = [
  // Engineering
  { value: 'civil',            label: 'Civil Engineer' },
  { value: 'mechanical',       label: 'Mechanical Engineer' },
  { value: 'electrical',       label: 'Electrical Engineer' },
  { value: 'chemical',         label: 'Chemical / Process Engineer' },
  { value: 'structural',       label: 'Structural Engineer' },
  { value: 'petroleum',        label: 'Petroleum Engineer' },
  { value: 'industrial',       label: 'Industrial Engineer' },
  { value: 'environmental',    label: 'Environmental / EHS Engineer' },
  { value: 'hvac',             label: 'HVAC Engineer' },
  { value: 'instrumentation',  label: 'Instrumentation Engineer' },
  { value: 'piping',           label: 'Piping Engineer' },
  { value: 'process',          label: 'Process Engineer' },
  { value: 'offshore',         label: 'Offshore Engineer' },
  { value: 'geotechnical',     label: 'Geotechnical Engineer' },
  { value: 'marine',           label: 'Marine Engineer' },
  { value: 'mep',              label: 'MEP Engineer' },
  // Project & Management
  { value: 'project_manager',       label: 'Project Manager' },
  { value: 'construction_manager',  label: 'Construction Manager' },
  { value: 'operations_manager',    label: 'Operations Manager' },
  { value: 'contracts_manager',     label: 'Contracts Manager' },
  { value: 'procurement_manager',   label: 'Procurement Manager' },
  { value: 'planning_engineer',     label: 'Planning Engineer' },
  { value: 'cost_estimator',        label: 'Cost Estimator' },
  { value: 'project_engineer',      label: 'Project Engineer' },
  // HSE & Quality
  { value: 'hse_officer',    label: 'HSE Officer' },
  { value: 'hse_manager',    label: 'HSE Manager' },
  { value: 'qaqc_engineer',  label: 'QA/QC Engineer' },
  { value: 'qaqc_inspector', label: 'QA/QC Inspector' },
  { value: 'safety_supervisor', label: 'Safety Supervisor' },
  // Technical & Field
  { value: 'site_supervisor',  label: 'Site Supervisor' },
  { value: 'foreman',          label: 'Foreman' },
  { value: 'mep_supervisor',   label: 'MEP Supervisor' },
  { value: 'technician',       label: 'Technician' },
  { value: 'electrician',      label: 'Electrician' },
  { value: 'welder',           label: 'Welder / Fabricator' },
  { value: 'equipment_operator', label: 'Heavy Equipment Operator' },
  // Admin & Support
  { value: 'hr_manager',     label: 'HR Manager' },
  { value: 'admin_manager',  label: 'Admin Manager' },
  { value: 'finance_manager',label: 'Finance Manager' },
  { value: 'it_manager',     label: 'IT Manager' },
  { value: 'doc_controller', label: 'Document Controller' },
  { value: 'logistics',      label: 'Logistics Coordinator' },
  // Other sectors
  { value: 'it',          label: 'IT & Technology' },
  { value: 'finance',     label: 'Finance & Accounting' },
  { value: 'healthcare',  label: 'Healthcare Professional' },
  { value: 'hospitality', label: 'Hospitality Professional' },
  { value: 'construction', label: 'Construction Professional' },
  { value: 'other',       label: 'Other' },
]

// Backward compat alias
export const ENGINEERING_DISCIPLINES = WORK_DISCIPLINES

// Subscription plans
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceLabel: '₹0',
    period: 'forever',
    features: [
      'View platform & pricing',
      'Create basic profile',
      'Browse salary insights',
    ],
    limits: {
      resumeOptimizations: 0,
      coverLetters: 0,
      atsChecks: 0,
    },
    color: 'gray',
  },
  starter: {
    name: 'Starter',
    price: 399,
    priceLabel: '₹399',
    period: 'month',
    features: [
      '3 resume optimizations/month',
      'ATS score checker',
      '2 cover letters/month',
      'Gulf resume templates',
      'Email support',
    ],
    limits: {
      resumeOptimizations: 3,
      coverLetters: 2,
      atsChecks: 5,
    },
    color: 'gold',
  },
  pro: {
    name: 'Pro',
    price: 899,
    priceLabel: '₹899',
    period: 'month',
    popular: true,
    features: [
      '10 resume optimizations/month',
      'Unlimited ATS checks',
      'Unlimited cover letters',
      'Gulf salary insights',
      'JD-specific optimizer',
      'Conflict detection',
      'Priority support',
    ],
    limits: {
      resumeOptimizations: 10,
      coverLetters: -1, // unlimited
      atsChecks: -1,    // unlimited
    },
    color: 'gold',
  },
  elite: {
    name: 'Elite',
    price: 1999,
    priceLabel: '₹1,999',
    period: 'month',
    features: [
      'Unlimited resume optimizations',
      'Unlimited everything',
      'LinkedIn profile review',
      'Monthly 1-on-1 consultation',
      'Priority Gulf job alerts',
      'Dedicated support',
    ],
    limits: {
      resumeOptimizations: -1, // unlimited
      coverLetters: -1,
      atsChecks: -1,
    },
    color: 'navy',
  },
}
