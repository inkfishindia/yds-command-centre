
import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval 
} from 'date-fns'

export interface CalendarEvent {
  id: string
  title: string
  date: Date
  type?: 'marketing' | 'sales' | 'ops' | 'finance'
  color?: string
}

interface CalendarViewProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onAddEvent?: (date: Date) => void
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, onEventClick, onAddEvent }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day))
  }

  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-primary)]">
        <h2 className="text-lg font-black uppercase tracking-tight text-[var(--color-text-primary)]">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-[var(--color-bg-stage)] rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())} 
            className="px-3 py-1.5 text-xs font-black uppercase tracking-widest hover:bg-[var(--color-bg-stage)] rounded-lg transition-colors"
          >
            Today
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-[var(--color-bg-stage)] rounded-lg transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 bg-[var(--color-bg-stage)]/50 border-b border-[var(--color-border-primary)]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
              {day}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = isSameMonth(day, monthStart)
          const isToday = isSameDay(day, new Date())

          return (
            <div 
              key={i} 
              className={`min-h-[120px] p-2 border-b border-r border-[var(--color-border-primary)] last:border-r-0 group transition-colors ${
                !isCurrentMonth ? 'bg-[var(--color-bg-stage)]/20' : 'bg-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-[var(--color-brand-primary)] text-white' : 
                  isCurrentMonth ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] opacity-50'
                }`}>
                  {format(day, 'd')}
                </span>
                <button 
                  onClick={() => onAddEvent?.(day)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="space-y-1">
                {dayEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className="w-full text-left px-2 py-1 rounded text-[9px] font-black uppercase tracking-tight truncate transition-all hover:scale-[1.02]"
                    style={{ 
                      backgroundColor: event.color || 'var(--color-bg-stage)', 
                      color: 'var(--color-text-primary)',
                      borderLeft: `3px solid ${event.color || 'var(--color-brand-primary)'}`
                    }}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarView
