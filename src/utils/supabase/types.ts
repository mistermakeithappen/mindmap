export type Organization = {
  id: string
  name: string
  slug: string
  created_at: string
  settings: Record<string, any>
}

export type Profile = {
  id: string
  organization_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'admin' | 'member' | 'viewer'
  created_at: string
}

export type Canvas = {
  id: string
  organization_id: string
  name: string
  description: string | null
  created_by: string | null
  thumbnail_url: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export type NodeType = 'text' | 'image' | 'video' | 'file' | 'link' | 'ai-response'

export type NodeData = {
  id: string
  canvas_id: string
  type: NodeType
  position: { x: number; y: number }
  data: Record<string, any>
  style: Record<string, any>
  created_at: string
  updated_at: string
}

export type EdgeType = 'default' | 'straight' | 'step' | 'smoothstep' | 'animated'

export type EdgeData = {
  id: string
  canvas_id: string
  source: string
  target: string
  type: EdgeType
  label: string | null
  style: Record<string, any>
  created_at: string
}

export type FileData = {
  id: string
  node_id: string
  storage_path: string
  filename: string
  mime_type: string
  size: number
  uploaded_at: string
}