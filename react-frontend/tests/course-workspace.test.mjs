import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

// Compile the pure domain module without loading browser configuration or React.
const source = await readFile(new URL('../src/features/courses/workspace.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { courseRole, courseNavigation, allowedCoursePage } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

const course = { id: 'course-a', owner_id: 'professor-a', name: 'Chemistry', code: 'CHEM 101' }

test('course ownership, not a global professor label, controls owner navigation', () => {
  assert.equal(courseRole(course, 'professor-a'), 'owner')
  assert.equal(courseRole(course, 'professor-b'), 'student')
  assert.equal(courseRole(course, 'student-a'), 'student')
  assert.ok(courseNavigation('owner').some(page => page.id === 'settings'))
  assert.ok(!courseNavigation('student').some(page => page.id === 'settings'))
})

test('a student cannot open owner settings by changing the URL', () => {
  assert.equal(allowedCoursePage('settings', 'student'), 'overview')
  assert.equal(allowedCoursePage('settings', 'owner'), 'settings')
})

test('normal course views survive URL selection and invalid views fall back', () => {
  for (const role of ['owner', 'student']) {
    for (const page of ['overview', 'materials', 'study', 'practice', 'progress']) {
      assert.equal(allowedCoursePage(page, role), page)
    }
    assert.equal(allowedCoursePage(null, role), 'overview')
    assert.equal(allowedCoursePage('unknown-page', role), 'overview')
  }
})
