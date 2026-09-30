import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

export type HttpIssue = { path: (string | number)[]; message: string; code: string }

export function jsonError(status: number, message: string, zodError?: ZodError) {
  const body: { error: string; issues?: HttpIssue[] } = { error: message }
  if (zodError) {
    body.issues = zodError.issues.map((issue) => ({
      path: issue.path as (string | number)[],
      message: issue.message,
      code: issue.code,
    }))
  }
  return NextResponse.json(body, { status })
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}