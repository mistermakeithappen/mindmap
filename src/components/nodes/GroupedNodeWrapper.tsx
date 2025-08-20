import { useNodeGroupsStore } from '@/lib/store/node-groups-store'
import { ReactNode, useMemo } from 'react'

interface GroupedNodeWrapperProps {
  nodeId: string
  children: ReactNode
  className?: string
}

export function GroupedNodeWrapper({ nodeId, children, className = '' }: GroupedNodeWrapperProps) {
  const { getNodeGroup } = useNodeGroupsStore()
  
  const group = useMemo(() => getNodeGroup(nodeId), [nodeId, getNodeGroup])
  
  if (!group) {
    return <>{children}</>
  }
  
  return (
    <div 
      className={`relative ${className}`}
      style={{
        outline: `2px dashed ${group.color || '#6366f1'}`,
        outlineOffset: '4px',
        borderRadius: '8px'
      }}
    >
      {/* Group indicator badge */}
      <div 
        className="absolute -top-6 -right-2 px-2 py-0.5 text-xs font-medium text-white rounded-full shadow-sm"
        style={{ 
          backgroundColor: group.color || '#6366f1',
          zIndex: 10
        }}
      >
        Grouped
      </div>
      {children}
    </div>
  )
}