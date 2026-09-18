# Study Buddy

## Overview

Study Buddy is an instructor-governed AI learning platform designed to help students study effectively while promoting responsible AI use and academic integrity.

Instead of functioning like a general-purpose chatbot, the system operates inside a course environment defined by the professor. Course materials, learning objectives, timelines, assessment styles, and AI behavior policies determine how the assistant is allowed to respond.

The core idea is:

**Professor defines the learning environment → Student studies and practices → System tracks concept-level performance → Future quizzes adapt to the student's weaknesses.**

The system should maintain persistent state across sessions so that when a student returns, it remembers what concepts they previously understood or struggled with.

---

## User Roles

### Professor

Professors create and configure courses.

Main capabilities:

- Create a course
- Invite students to the course
- Upload course materials

  - Syllabus
  - Lecture slides
  - Research papers
  - Textbook chapters

- Review AI-generated course topics and learning objectives
- Define when topics become active or relevant based on the course timeline
- Configure how the AI interacts with students
- Configure practice-question styles
- Define academic-integrity boundaries

The professor's course configuration should influence all student interactions.

Example professor policies:

- Allow conceptual explanations
- Allow concept maps and review sheets
- Give hints before answers
- Ask guiding or Socratic questions
- Require a student attempt before giving an explanation
- Do not provide direct solutions to graded homework
- Restrict explanations to material already covered in the course
- Generate conceptual, calculation-based, multiple-choice, free-response, or mixed practice questions

Example:

If a student asks:

> "Just give me the answer to problem 7."

and the professor has disabled direct homework solutions, the assistant should respond in a way such as:

> "Your instructor has configured this course to use guided hints for assigned problems. Show me what you've tried so far, and I can help you work through the next step."

---

## Student

Students join courses created by professors.

The student experience contains three main areas.

### Study

Students interact with a course-aware chatbot.

Possible actions:

- Ask questions about course material
- Explain a concept
- Generate a concept map
- Generate a critical-review sheet
- Review a research paper or textbook chapter
- Receive explanations appropriate to the professor's course policies

The assistant should prioritize professor-provided materials as the source of course context.

---

### Practice

Students can generate quizzes based on currently available course topics.

Quiz modes may include:

- Quiz by topic
- Review weak concepts
- Cumulative quiz
- Exam-style practice

The professor's assessment preferences should influence question generation.

Example:

A professor may configure a course to emphasize:

- 20% definitions
- 40% conceptual reasoning
- 20% application
- 20% data or figure interpretation

---

### Progress

Students should be able to see which concepts they:

- Mastered
- Are developing
- Need to review

Avoid presenting mastery as an overly precise scientific score unless necessary.

Concept-level progress is more important than remembering individual quiz questions.

---

## Persistent Student Memory

The system should remember student performance across sessions.

Do not only store:

```text
Question 4 = incorrect
```

Instead, associate quiz performance with the underlying course concept.

Example:

```text
Concept: Lysosomal sequestration
Status: Review Needed
Times Practiced: 3
Correct Attempts: 1
Last Result: Incorrect
Last Reviewed: 2026-09-18
```

This allows the system to generate a different question testing the same concept later.

The persistence should survive:

- Browser refresh
- Logout/login
- Application restart
- New chat session

---

## Adaptive Quiz Behavior

The quiz system should emphasize retrieval practice and concept mastery.

Basic MVP behavior:

```text
Student receives question
        ↓
Student answers
        ↓
Determine underlying concept
        ↓
Correct?
   ↓            ↓
 Yes           No
 ↓              ↓
Reduce         Mark concept
priority       for review
                 ↓
          Re-test later
```

Previously mastered concepts should appear less frequently.

Incorrect concepts should appear again in later sessions.

Whenever possible, generate a **new question testing the same concept**, rather than simply repeating the exact previous question.

Example:

Original question:

> Why does increasing temperature generally increase reaction rate?

Later review question:

> Two reactions have identical concentrations but occur at different temperatures. Explain why their rates differ using collision theory.

The concept is the same, but the student cannot succeed merely by memorizing the previous answer.

---

## System State

The application should maintain three major categories of state.

### Course State

Information shared across the entire course:

- Course name
- Syllabus
- Lecture slides
- Textbook materials
- Research papers
- Schedule
- Topics
- Learning objectives
- Chapters or topics currently active
- Professor instructions

### Professor Policy

Rules controlling AI behavior:

- What kinds of explanations are allowed
- Whether direct answers are allowed
- Whether students must attempt problems first
- Hint behavior
- Assessment style
- Question difficulty
- Question format
- Material currently considered in scope
- Academic-integrity restrictions

### Student State

Information specific to each student:

- Concepts practiced
- Questions attempted
- Correct/incorrect answers
- Misconceptions
- Current concept status
- Last review time
- Quiz history
- Chat history where appropriate

Student state must be isolated between students.

---

## Suggested Data Model

Possible backend entities:

```text
User
Course
Enrollment
CourseMaterial
CoursePolicy
Topic
LearningObjective
StudentConceptState
Quiz
QuizQuestion
QuizAttempt
ChatSession
```

Important concept state example:

```text
StudentConceptState

student_id
course_id
concept_id
status
times_seen
times_correct
last_result
last_reviewed
next_review
```

Possible statuses:

```text
MASTERED
DEVELOPING
REVIEW_NEEDED
```

---

## Course Timeline

The professor may associate topics or chapters with a course schedule.

Example:

```text
Week 1
Chapter 1

Week 2
Chapters 2-3

Week 3
Chapter 4

Exam 1
Chapters 1-4
```

For the MVP, the timeline should primarily determine which material is currently in scope.

Avoid building a complicated LMS-style release system unless necessary.

---

## Academic Integrity

Academic integrity is a central feature of the product.

The AI should not independently decide what level of assistance is appropriate.

Instead:

```text
Professor policy
        ↓
AI behavior
        ↓
Student interaction
```

Examples:

Allowed:

- Explain concepts
- Give examples
- Generate practice problems
- Provide hints
- Ask guiding questions
- Explain mistakes on practice quizzes

Potentially restricted:

- Give direct homework answers
- Solve graded assignments completely
- Reveal professor-only materials
- Use material outside the course scope

Professor-only resources must never be exposed to students.

---

## Accessibility

The frontend should support accessible study experiences.

Possible modes:

### Focus / ADHD-Friendly Mode

- Shorter content chunks
- One task at a time
- Minimal visual clutter
- Small quiz sets
- Clear progress indicators

### Dyslexia-Friendly Mode

- Increased spacing
- Adjustable font size
- Shorter line lengths
- Reduced dense paragraphs
- Clear visual hierarchy

### Screen-Reader-Friendly Mode

- Semantic headings
- Keyboard navigation
- Text alternatives for visual concept maps
- Linear representation of hierarchical information

Accessibility should affect interaction and presentation, not just visual styling.

---

## Frontend

Preferred framework:

```text
React
```

Major views:

```text
Landing Page

Authentication
├── Sign Up
├── Sign In
└── Professor / Student role

Professor Dashboard
├── Courses
├── Create Course
├── Upload Materials
├── Students
├── Course Timeline
├── Learning Objectives
└── AI Policies

Student Dashboard
├── Courses
├── Study
├── Practice
└── Progress
```

A `.edu` email requirement may be added for authentication if useful.

---

## Backend

The backend should support:

- Authentication
- Role authorization
- Course enrollment
- Persistent database storage
- File storage
- Course-material retrieval
- LLM calls
- Quiz generation
- Concept extraction
- Student performance tracking
- Persistent chat/session memory

The LLM provider should remain modular so models can be swapped later.

Do not tightly couple application logic to one specific model.

---

## Retrieval and LLM Behavior

When answering course questions, the assistant should prioritize:

1. Professor policy
2. Current course scope
3. Professor-provided materials
4. Student learning state
5. General model knowledge only when appropriate

Recommended conceptual flow:

```text
Student request
      ↓
Load course policy
      ↓
Load currently active course material
      ↓
Load relevant student state
      ↓
Retrieve relevant source content
      ↓
Generate response
      ↓
Apply professor restrictions
      ↓
Return response
```

The assistant should avoid introducing advanced methods or terminology that has not yet been covered unless the student explicitly asks for broader context and professor policy allows it.

---

## Demo Flow

The demo should emphasize agentic behavior and persistent memory.

### Professor Demo

1. Log in as professor.
2. Create a course.
3. Upload syllabus and slides.
4. AI extracts suggested topics and learning objectives.
5. Professor approves or edits them.
6. Professor configures an AI policy.
7. Professor invites a student.

### Student Demo

1. Log in as student.
2. Open the course.
3. Generate a concept map or review sheet.
4. Take a short quiz.
5. Intentionally answer some questions incorrectly.
6. Show those concepts being marked as needing review.
7. Ask the AI for a direct homework answer.
8. Demonstrate that professor policy changes how the AI responds.
9. Quit or log out of the application.
10. Relaunch and log back in.
11. Generate another quiz.
12. Show that the system remembers the student's weak concepts.
13. Ask a new question testing the same underlying concept.

The key demo moment is:

```text
Session 1:
Concept A → Correct
Concept B → Incorrect
Concept C → Correct

Application closes.

Session 2:
Concept B receives priority.
Concepts A and C are deprioritized.
A NEW question tests Concept B.
```

This demonstrates persistent memory rather than normal chatbot context.

---

## MVP Priorities

### Must Have

- Professor/student authentication
- Course creation
- Student enrollment
- Course material upload
- Professor AI policy
- Student course-aware chatbot
- Quiz generation
- Concept-level correct/incorrect tracking
- Persistent student state
- Adaptive re-quizzing after application restart

### Nice to Have

- Topic-specific quizzes
- Course timeline
- Concept-map visualization
- Progress dashboard
- Accessibility modes
- Question-style configuration

### Future Development

- Canvas integration
- Gradescope integration
- LMS roster synchronization
- Grade-aware recommendations
- Professor analytics
- Assignment synchronization
- Calendar integration
- More sophisticated spaced-repetition scheduling

---

## Product Principle

Do not build a general chatbot inside an LMS.

The distinctive feature of the product is:

**Instructor-governed personalized AI tutoring with persistent concept-level learning memory.**

Every major feature should support one of these goals:

1. Help students learn.
2. Keep assistance aligned with the professor's course.
3. Encourage responsible AI use.
4. Preserve academic integrity.
5. Adapt future studying based on demonstrated student understanding.
