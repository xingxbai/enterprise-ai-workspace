import "server-only";

import type { ZodError, ZodIssue } from "zod";

type FieldLabels = Record<string, string>;

function getIssueField(issue: ZodIssue) {
  return issue.path.length > 0 ? issue.path.join(".") : null;
}

function getIssueLabel(issue: ZodIssue, fieldLabels: FieldLabels) {
  const field = getIssueField(issue);

  if (!field) {
    return null;
  }

  return fieldLabels[field] ?? field;
}

function isZodDefaultEnglishMessage(message: string) {
  return (
    message.startsWith("Invalid input") ||
    message.startsWith("Unrecognized key")
  );
}

export function createRequestValidationMessage(
  error: ZodError,
  fieldLabels: FieldLabels = {},
) {
  const issue = error.issues[0];

  if (!issue) {
    return "请求参数不正确";
  }

  if (issue.message && !isZodDefaultEnglishMessage(issue.message)) {
    return issue.message;
  }

  const label = getIssueLabel(issue, fieldLabels);

  if (issue.code === "unrecognized_keys") {
    return "请求包含不支持的字段";
  }

  if (issue.code === "invalid_type") {
    // 企业重点：缺字段和类型错误都转成稳定中文文案，不把 Zod 原始英文错误暴露给前端。
    return label ? `${label} 不能为空或类型不正确` : "请求参数类型不正确";
  }

  if (issue.code === "invalid_value") {
    return label ? `${label} 不在支持范围内` : "请求参数不在支持范围内";
  }

  return label ? `${label} 格式不正确` : "请求参数不正确";
}

export function createBadRequestResponseFromZodError(
  error: ZodError,
  fieldLabels?: FieldLabels,
) {
  return Response.json(
    { message: createRequestValidationMessage(error, fieldLabels) },
    { status: 400 },
  );
}
