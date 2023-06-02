export interface JSONRPCRequestPayload {
  params: any[]
  method: string
  id: number
  jsonrpc: string
}
