import { encryptSensitiveIntake } from './encryption'

export type IntakeQuestionDefinition = {
  id: string
  label: string
  type: string
  required: boolean
  sensitive: boolean
  options: unknown
}

export function buildIntakeSubmission(input: {
  questions: IntakeQuestionDefinition[]
  answers: Record<string, string>
  sensitiveConsent: boolean
  secret: string
  now?: Date
}) {
  const questions = Array.from(new Map(input.questions.map((question) => [question.id, question])).values())
  for (const question of questions) {
    if (question.required && !input.answers[question.id]?.trim()) throw new Error('INTAKE_REQUIRED')
  }
  const sensitiveQuestions = questions.filter((question) => question.sensitive && input.answers[question.id]?.trim())
  if (sensitiveQuestions.length && !input.sensitiveConsent) throw new Error('INTAKE_CONSENT_REQUIRED')
  const responses = Object.fromEntries(questions.filter((question) => !question.sensitive && input.answers[question.id]?.trim()).map((question) => [question.id, input.answers[question.id]!.trim()]))
  const sensitiveAnswers = Object.fromEntries(sensitiveQuestions.map((question) => [question.id, input.answers[question.id]!.trim()]))
  return {
    definition: questions.map((question) => ({ ...question })),
    responses,
    sensitive: sensitiveQuestions.length ? encryptSensitiveIntake(sensitiveAnswers, input.secret) : null,
    consentAt: sensitiveQuestions.length ? (input.now ?? new Date()) : null,
  }
}
