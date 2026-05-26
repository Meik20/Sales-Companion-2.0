import { redirect } from 'next/navigation'

// /admin → redirige vers /admin/dashboard
export default function AdminIndexPage() {
  redirect('/admin/dashboard')
}
