
import React from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

interface TimelineChartProps {
  data: any[]
  xKey: string
  yKey: string
  type?: 'line' | 'area'
  color?: string
  height?: number
  showGrid?: boolean
}

const TimelineChart: React.FC<TimelineChartProps> = ({
  data,
  xKey,
  yKey,
  type = 'area',
  color = 'var(--color-brand-primary)',
  height = 200,
  showGrid = true
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] p-2 rounded shadow-lg">
          <p className="text-[10px] font-black uppercase text-[var(--color-text-secondary)]">{label}</p>
          <p className="text-sm font-black text-[var(--color-brand-primary)]">
            {payload[0].value.toLocaleString()}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" vertical={false} />}
            <XAxis 
              dataKey={xKey} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--color-text-secondary)' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--color-text-secondary)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey={yKey} 
              stroke={color} 
              strokeWidth={3} 
              dot={{ r: 4, fill: color, strokeWidth: 2, stroke: 'var(--color-bg-surface)' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" vertical={false} />}
            <XAxis 
              dataKey={xKey} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--color-text-secondary)' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--color-text-secondary)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey={yKey} 
              stroke={color} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorGradient)" 
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export default TimelineChart
