// =============================================================
// Demo fixtures — the ONLY data source for the /demo experience.
//
// This file is intentionally self-contained: it imports nothing from
// the Supabase clients and is never wired to a database. Every /demo
// page reads from here, which is what guarantees the demo can't reach
// a single row of real student data. If you're tempted to make a demo
// page query Supabase, don't — add fake data here instead.
//
// Names, scores, and submissions below are entirely invented.
// =============================================================

import type { UserProfile } from "@/lib/profile";
import type { AssignmentType } from "@/lib/assignments";

export type DemoRole = "teacher" | "student";

// ---- People -------------------------------------------------

/** The teacher whose seat a visitor takes in the teacher demo. */
export const DEMO_TEACHER: UserProfile = {
  id: "demo-teacher",
  first_name: "Jamie",
  last_name: "Avery",
  username: "teacherdemo",
  real_email: null,
  role: "teacher",
  avatar_url: null,
  email_notifications: true,
  reduced_motion: false,
  student_id: null,
  extended_time: "none",
};

export type DemoStudent = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string | null;
  /** Running grade average as a percentage, or null if nothing graded. */
  averagePct: number | null;
  missingCount: number;
  lessonsCompleted: number;
};

export const DEMO_STUDENTS: DemoStudent[] = [
  { id: "stu-maya", firstName: "Maya", lastName: "Rivera", username: "mayar", avatarUrl: null, averagePct: 94, missingCount: 0, lessonsCompleted: 11 },
  { id: "stu-devon", firstName: "Devon", lastName: "Park", username: "devonp", avatarUrl: null, averagePct: 88, missingCount: 0, lessonsCompleted: 10 },
  { id: "stu-aisha", firstName: "Aisha", lastName: "Khan", username: "aishak", avatarUrl: null, averagePct: 91, missingCount: 1, lessonsCompleted: 9 },
  { id: "stu-liam", firstName: "Liam", lastName: "O'Brien", username: "liamo", avatarUrl: null, averagePct: 62, missingCount: 3, lessonsCompleted: 5 },
  { id: "stu-sofia", firstName: "Sofia", lastName: "Torres", username: "sofiat", avatarUrl: null, averagePct: 79, missingCount: 1, lessonsCompleted: 8 },
  { id: "stu-noah", firstName: "Noah", lastName: "Bennett", username: "noahb", avatarUrl: null, averagePct: null, missingCount: 4, lessonsCompleted: 2 },
];

/** The student whose seat a visitor takes in the student demo. */
export const DEMO_VIEWER_STUDENT = DEMO_STUDENTS[0];

export function demoStudentProfile(s: DemoStudent): UserProfile {
  return {
    id: s.id,
    first_name: s.firstName,
    last_name: s.lastName,
    username: s.username,
    real_email: null,
    role: "student",
    avatar_url: s.avatarUrl,
    email_notifications: true,
    reduced_motion: false,
    student_id: null,
    extended_time: "none",
  };
}

export function findDemoStudent(id: string): DemoStudent | undefined {
  return DEMO_STUDENTS.find((s) => s.id === id);
}

// ---- Classroom ----------------------------------------------

export const DEMO_CLASS = {
  id: "demo-class",
  name: "Game Design",
  periodNumber: 2,
  term: "Spring 2026",
};

// ---- Curriculum (units + lessons) ---------------------------

export type DemoLesson = {
  id: string;
  title: string;
  completed: boolean;
};

export type DemoUnit = {
  id: string;
  title: string;
  description: string;
  published: boolean;
  lessons: DemoLesson[];
};

// Completion flags here reflect the demo VIEWER student (Maya).
export const DEMO_UNITS: DemoUnit[] = [
  {
    id: "unit-1",
    title: "Intro to Game Design",
    description: "What makes games fun, the core game loop, and writing a design doc.",
    published: true,
    lessons: [
      { id: "l-1-1", title: "What Makes a Game Fun?", completed: true },
      { id: "l-1-2", title: "The Core Game Loop", completed: true },
      { id: "l-1-3", title: "Writing a Design Document", completed: true },
    ],
  },
  {
    id: "unit-2",
    title: "Unity Basics",
    description: "Get comfortable in the Unity editor: scenes, GameObjects, and prefabs.",
    published: true,
    lessons: [
      { id: "l-2-1", title: "Touring the Unity Editor", completed: true },
      { id: "l-2-2", title: "GameObjects & Components", completed: true },
      { id: "l-2-3", title: "Prefabs & the Hierarchy", completed: true },
    ],
  },
  {
    id: "unit-3",
    title: "C# Scripting",
    description: "Variables, methods, and logic — the building blocks of game behavior.",
    published: true,
    lessons: [
      { id: "l-3-1", title: "Variables & Types", completed: true },
      { id: "l-3-2", title: "Methods & Parameters", completed: true },
      { id: "l-3-3", title: "Conditionals & Loops", completed: true },
      { id: "l-3-4", title: "Reading Player Input", completed: false },
    ],
  },
  {
    id: "unit-4",
    title: "Building Your First Game",
    description: "Put it together: movement, collisions, and a working score system.",
    published: true,
    lessons: [
      { id: "l-4-1", title: "Player Movement", completed: false },
      { id: "l-4-2", title: "Collisions & Triggers", completed: false },
      { id: "l-4-3", title: "Scoring & On-Screen UI", completed: false },
    ],
  },
];

export const DEMO_LESSON_TOTAL = DEMO_UNITS.reduce(
  (sum, u) => sum + u.lessons.length,
  0
);

// ---- Assignments --------------------------------------------

export type DemoAssignment = {
  id: string;
  title: string;
  type: AssignmentType;
  unitTitle: string;
  points: number;
  published: boolean;
  isUnitQuiz: boolean;
  dueDate: string; // display string, e.g. "May 8"
  instructions: string;
  /** The demo viewer student's relationship to this assignment. */
  viewer: {
    status: "draft" | "submitted" | "graded" | null;
    score: number | null;
  };
};

export const DEMO_ASSIGNMENTS: DemoAssignment[] = [
  {
    id: "a-design-doc",
    title: "Design Doc: Your Dream Game",
    type: "short_answer",
    unitTitle: "Intro to Game Design",
    points: 20,
    published: true,
    isUnitQuiz: false,
    dueDate: "Apr 10",
    instructions:
      "Pitch a game you'd love to make. Describe the core loop, the player's goal, and one mechanic that makes it special. 200+ words.",
    viewer: { status: "graded", score: 19 },
  },
  {
    id: "a-hello-unity",
    title: "Hello Unity: Move the Cube",
    type: "code",
    unitTitle: "Unity Basics",
    points: 15,
    published: true,
    isUnitQuiz: false,
    dueDate: "Apr 24",
    instructions:
      "Write a MonoBehaviour that moves a cube to the right at a constant speed. Use Time.deltaTime so it's frame-rate independent.",
    viewer: { status: "graded", score: 15 },
  },
  {
    id: "a-unit2-quiz",
    title: "Unit 2 Quiz: Unity Basics",
    type: "short_answer",
    unitTitle: "Unity Basics",
    points: 10,
    published: true,
    isUnitQuiz: true,
    dueDate: "Apr 26",
    instructions: "Ten questions on GameObjects, components, and prefabs.",
    viewer: { status: "graded", score: 9 },
  },
  {
    id: "a-player-movement",
    title: "Player Movement Script",
    type: "code",
    unitTitle: "C# Scripting",
    points: 25,
    published: true,
    isUnitQuiz: false,
    dueDate: "May 8",
    instructions:
      "Write a PlayerController that reads keyboard input and moves the player in four directions at a configurable speed. Keep movement smooth and frame-rate independent.",
    viewer: { status: "submitted", score: null },
  },
  {
    id: "a-coin-collector",
    title: "Coin Collector Prototype",
    type: "unity_upload",
    unitTitle: "Building Your First Game",
    points: 40,
    published: true,
    isUnitQuiz: false,
    dueDate: "May 22",
    instructions:
      "Build a small scene where the player moves around and collects coins. Track the score and show it on screen. Upload your Unity project as a .zip.",
    viewer: { status: "draft", score: null },
  },
  {
    id: "a-playtest-reflection",
    title: "Reflection: Playtesting a Classmate's Game",
    type: "discussion",
    unitTitle: "Building Your First Game",
    points: 10,
    published: false,
    isUnitQuiz: false,
    dueDate: "May 29",
    instructions:
      "Play a classmate's prototype and post two things that worked and one suggestion to make it more fun.",
    viewer: { status: null, score: null },
  },
];

export function findDemoAssignment(id: string): DemoAssignment | undefined {
  return DEMO_ASSIGNMENTS.find((a) => a.id === id);
}

// ---- Grading queue (teacher) --------------------------------

export type DemoSubmissionToGrade = {
  id: string;
  studentId: string;
  studentName: string;
  assignmentTitle: string;
  assignmentType: AssignmentType;
  submittedAt: string; // display string
  isLate: boolean;
};

export const DEMO_GRADING_QUEUE: DemoSubmissionToGrade[] = [
  { id: "sub-1", studentId: "stu-maya", studentName: "Maya Rivera", assignmentTitle: "Player Movement Script", assignmentType: "code", submittedAt: "2 hours ago", isLate: false },
  { id: "sub-2", studentId: "stu-devon", studentName: "Devon Park", assignmentTitle: "Player Movement Script", assignmentType: "code", submittedAt: "Yesterday", isLate: false },
  { id: "sub-3", studentId: "stu-aisha", studentName: "Aisha Khan", assignmentTitle: "Player Movement Script", assignmentType: "code", submittedAt: "Yesterday", isLate: false },
  { id: "sub-4", studentId: "stu-sofia", studentName: "Sofia Torres", assignmentTitle: "Player Movement Script", assignmentType: "code", submittedAt: "2 days ago", isLate: true },
  { id: "sub-5", studentId: "stu-liam", studentName: "Liam O'Brien", assignmentTitle: "Design Doc: Your Dream Game", assignmentType: "short_answer", submittedAt: "3 days ago", isLate: true },
];

// ---- Student work sample (for the code-editor demo) ---------

export const DEMO_CODE_SUBMISSION = `using UnityEngine;

public class PlayerController : MonoBehaviour
{
    public float speed = 5f;

    void Update()
    {
        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");

        Vector3 move = new Vector3(h, 0f, v);
        transform.Translate(move * speed * Time.deltaTime);
    }
}`;

export const DEMO_TEACHER_FEEDBACK =
  "Clean work, Maya! Movement is smooth and you used Time.deltaTime correctly. " +
  "Next step: try normalizing the move vector so diagonal movement isn't faster than straight movement.";

// ---- Discussions --------------------------------------------

export type DemoDiscussionPost = {
  id: string;
  authorName: string;
  authorId: string;
  body: string;
  postedAt: string;
  replies: { id: string; authorName: string; body: string; postedAt: string }[];
};

export const DEMO_DISCUSSION = {
  title: "What's the most fun game you've ever played, and why?",
  description:
    "Think about what kept you hooked — the challenge, the story, the people you played with? Post your pick and reply to at least one classmate.",
  posts: [
    {
      id: "post-1",
      authorName: "Devon Park",
      authorId: "stu-devon",
      body: "Hollow Knight. The world is huge and every time I thought I'd seen it all there was another secret area. The challenge felt fair — when I died it was always my fault, not the game's.",
      postedAt: "2 days ago",
      replies: [
        { id: "reply-1", authorName: "Maya Rivera", body: "Yes! The 'fair difficulty' thing is so real. That's what we read about in the game loop lesson.", postedAt: "1 day ago" },
      ],
    },
    {
      id: "post-2",
      authorName: "Aisha Khan",
      authorId: "stu-aisha",
      body: "Stardew Valley for me. There's no pressure — you just build your farm and the loop of plant, water, harvest is weirdly relaxing. Good example of a game that isn't about winning.",
      postedAt: "2 days ago",
      replies: [],
    },
    {
      id: "post-3",
      authorName: "Maya Rivera",
      authorId: "stu-maya",
      body: "Mario Kart with my family. It's simple to pick up but the blue shell keeps anyone from running away with it, so every race stays close. That tension is the whole fun.",
      postedAt: "1 day ago",
      replies: [],
    },
  ] as DemoDiscussionPost[],
};

// ---- Analytics ----------------------------------------------

export const DEMO_TIME_ON_TASK = [
  { assignmentId: "a-player-movement", assignmentTitle: "Player Movement Script", avgMinutes: 38, sampleSize: 5 },
  { assignmentId: "a-hello-unity", assignmentTitle: "Hello Unity: Move the Cube", avgMinutes: 22, sampleSize: 6 },
  { assignmentId: "a-design-doc", assignmentTitle: "Design Doc: Your Dream Game", avgMinutes: 31, sampleSize: 6 },
];

// Heatmap: average score (%) per unit per (single demo) class section.
export const DEMO_HEATMAP_UNITS = [
  { unit: "Intro to Game Design", pct: 92 },
  { unit: "Unity Basics", pct: 86 },
  { unit: "C# Scripting", pct: 74 },
  { unit: "Building Your First Game", pct: 0 }, // not started
];
