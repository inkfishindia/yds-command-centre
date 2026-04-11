
import React from 'react'
import { 
  ManagerEditorLayout, 
  CalendarView 
} from '../ui'

const ContentCalendarPage = () => {
  const events = [
    { id: '1', title: 'IG: Product Launch', date: new Date(2026, 3, 15), type: 'marketing', color: '#ec4899' },
    { id: '2', title: 'Blog: Design Trends', date: new Date(2026, 3, 18), type: 'marketing', color: '#3b82f6' },
    { id: '3', title: 'YT: Behind the Scenes', date: new Date(2026, 3, 22), type: 'marketing', color: '#ef4444' },
    { id: '4', title: 'Newsletter: Monthly Recap', date: new Date(2026, 3, 30), type: 'marketing', color: '#10b981' },
  ]

  return (
    <ManagerEditorLayout title="Content Calendar">
      <CalendarView events={events as any} />
    </ManagerEditorLayout>
  )
}

export default ContentCalendarPage;
