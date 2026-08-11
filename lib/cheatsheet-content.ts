// Client-safe: pure reference content for the C# cheat sheet at
// /cheatsheet. The plain-C# sections are hand-written here; the Unity API
// tables are NOT duplicated here — the page renders those straight from
// lib/monaco/unity-api.ts (the same data driving editor autocomplete), so
// the cheat sheet can't drift out of sync with what the editor suggests.

export type CheatEntry = {
  term: string;
  signature?: string;
  description: string;
  example?: string;
};

export type CheatSection = {
  id: string;
  title: string;
  intro?: string;
  entries: CheatEntry[];
};

export const CSHARP_SECTIONS: CheatSection[] = [
  {
    id: "variables",
    title: "Variables & types",
    intro: "Every variable has a type, declared before its name.",
    entries: [
      {
        term: "int",
        signature: "int score = 0;",
        description: "Whole number, no decimal.",
      },
      {
        term: "float",
        signature: "float speed = 4.5f;",
        description: "Decimal number. The trailing f is required.",
      },
      {
        term: "double",
        signature: "double pi = 3.14159;",
        description: "Bigger, more precise decimal. Console math defaults to this.",
      },
      {
        term: "bool",
        signature: "bool isAlive = true;",
        description: "true or false only.",
      },
      {
        term: "string",
        signature: 'string name = "Kira";',
        description: "Text, in double quotes.",
      },
      {
        term: "char",
        signature: "char grade = 'A';",
        description: "One character, in single quotes.",
      },
      {
        term: "var",
        signature: "var count = 5;",
        description: "Let the compiler infer the type from the value. Still strongly typed — count is still an int.",
      },
      {
        term: "const",
        signature: "const float Gravity = 9.8f;",
        description: "A value that can never change after it's set. Always assign it right away.",
      },
      {
        term: "Type conversion",
        signature: 'int.Parse("42")  ·  Convert.ToInt32(x)  ·  x.ToString()',
        description: "Text ↔ number conversions. int.Parse throws if the text isn't a valid number — TryParse is the safe version.",
        example:
          'if (int.TryParse(input, out int result))\n{\n    Console.WriteLine(result);\n}',
      },
    ],
  },
  {
    id: "operators",
    title: "Operators",
    entries: [
      {
        term: "Arithmetic",
        signature: "+  -  *  /  %",
        description: "% is remainder (modulo) — e.g. 7 % 2 is 1.",
      },
      {
        term: "Comparison",
        signature: "==  !=  <  >  <=  >=",
        description: "== compares values, not the same as = (assignment).",
      },
      {
        term: "Logical",
        signature: "&&  ||  !",
        description: "AND, OR, NOT — combine bool conditions.",
      },
      {
        term: "Compound assignment",
        signature: "+=  -=  *=  /=  ++  --",
        description: "x += 1 is short for x = x + 1. ++x and x++ both add one.",
      },
      {
        term: "String interpolation",
        signature: 'string msg = $"Score: {score}";',
        description: "Drop variables straight into a string with $\"...{expr}...\". The go-to way to build text.",
      },
      {
        term: "Null-conditional / null-coalescing",
        signature: "obj?.DoThing();  x ?? defaultValue;",
        description: "?. skips the call if obj is null. ?? gives a fallback if the left side is null.",
      },
    ],
  },
  {
    id: "control-flow",
    title: "Control flow",
    entries: [
      {
        term: "if / else if / else",
        example:
          'if (score >= 90)\n{\n    grade = "A";\n}\nelse if (score >= 80)\n{\n    grade = "B";\n}\nelse\n{\n    grade = "C";\n}',
        description: "Runs the first block whose condition is true.",
      },
      {
        term: "switch",
        example:
          'switch (day)\n{\n    case 1:\n        name = "Monday";\n        break;\n    case 2:\n        name = "Tuesday";\n        break;\n    default:\n        name = "Unknown";\n        break;\n}',
        description: "Cleaner than a long if/else chain when checking one value against many options. Don't forget break.",
      },
      {
        term: "Ternary",
        signature: "string result = isAlive ? \"Alive\" : \"Dead\";",
        description: "condition ? valueIfTrue : valueIfFalse — a one-line if/else that returns a value.",
      },
    ],
  },
  {
    id: "loops",
    title: "Loops",
    entries: [
      {
        term: "for",
        example: "for (int i = 0; i < 10; i++)\n{\n    Console.WriteLine(i);\n}",
        description: "Runs a set number of times. Init; condition; step.",
      },
      {
        term: "foreach",
        example: 'foreach (var item in myList)\n{\n    Console.WriteLine(item);\n}',
        description: "Walks every item in a collection — the go-to loop for arrays and Lists.",
      },
      {
        term: "while",
        example: "while (health > 0)\n{\n    // keep going\n}",
        description: "Repeats as long as the condition is true. Checked before each pass.",
      },
      {
        term: "do / while",
        example: "do\n{\n    // runs at least once\n} while (playAgain);",
        description: "Same as while, but always runs the body at least once.",
      },
      {
        term: "break / continue",
        description: "break exits the loop entirely. continue skips straight to the next iteration.",
      },
    ],
  },
  {
    id: "collections",
    title: "Arrays & Lists",
    entries: [
      {
        term: "Array",
        signature: "int[] scores = { 90, 85, 77 };",
        description: "Fixed size, set at creation. scores[0] is the first item.",
      },
      {
        term: "List<T>",
        signature: "List<int> scores = new List<int>();",
        description: "Resizable — the collection you'll reach for most. Add/remove items freely.",
        example:
          "scores.Add(95);\nscores.Remove(77);\nint first = scores[0];\nint howMany = scores.Count;",
      },
      {
        term: "Dictionary<TKey, TValue>",
        signature: 'Dictionary<string, int> hp = new Dictionary<string, int>();',
        description: "Key → value lookup. hp[\"player\"] = 100; then read it back with hp[\"player\"].",
      },
      {
        term: ".Length vs .Count",
        description: "Arrays use .Length. Lists (and most other collections) use .Count.",
      },
    ],
  },
  {
    id: "methods",
    title: "Methods",
    entries: [
      {
        term: "Declaring a method",
        example:
          "int Add(int a, int b)\n{\n    return a + b;\n}\n\nvoid PrintHello()\n{\n    Console.WriteLine(\"Hello!\");\n}",
        description: "returnType MethodName(parameters). void means it returns nothing.",
      },
      {
        term: "Optional / default parameters",
        signature: "void Damage(int amount, bool isCritical = false)",
        description: "Give a parameter a default so callers can leave it out.",
      },
      {
        term: "Overloading",
        description: "Multiple methods can share a name if their parameter lists differ — the compiler picks the right one from what you pass in.",
      },
    ],
  },
  {
    id: "classes",
    title: "Classes & objects",
    entries: [
      {
        term: "Class basics",
        example:
          'public class Player\n{\n    public string name;\n    public int health = 100;\n\n    public void TakeDamage(int amount)\n    {\n        health -= amount;\n    }\n}',
        description: "A class bundles data (fields) and behavior (methods) together.",
      },
      {
        term: "Creating an instance",
        signature: "Player p = new Player();",
        description: "new calls the constructor and gives you an object to work with.",
      },
      {
        term: "Constructor",
        example:
          'public class Player\n{\n    public string name;\n\n    public Player(string startingName)\n    {\n        name = startingName;\n    }\n}',
        description: "A special method (same name as the class) that runs once when you create the object with new.",
      },
      {
        term: "Access modifiers",
        signature: "public  ·  private  ·  protected",
        description: "public: anyone can use it. private: only this class. protected: this class + subclasses.",
      },
      {
        term: "Properties",
        example:
          "public int Health { get; set; }\n\npublic int HealthPercent\n{\n    get { return Health; }\n    set { Health = Mathf.Clamp(value, 0, 100); }\n}",
        description: "Like a field, but you can add logic to reading (get) or writing (set) it.",
      },
      {
        term: "static",
        description: "Belongs to the class itself, not one instance — shared by everyone. Access it as ClassName.Member, no new needed.",
      },
      {
        term: "this",
        description: "Refers to the current instance — mostly used to tell a parameter apart from a field of the same name.",
      },
    ],
  },
  {
    id: "errors",
    title: "Handling errors",
    entries: [
      {
        term: "try / catch",
        example:
          "try\n{\n    int result = 10 / divisor;\n}\ncatch (DivideByZeroException e)\n{\n    Console.WriteLine(\"Can't divide by zero!\");\n}",
        description: "Run risky code in try; if it throws, catch handles it instead of crashing.",
      },
      {
        term: "Common compile errors",
        description:
          "CS1002 (missing ;) · CS0103 (name doesn't exist — typo or missing using) · CS0029 (can't convert one type to another) · CS1513 (missing }).",
      },
    ],
  },
];

export const UNITY_LIFECYCLE_SECTION: CheatSection = {
  id: "unity-lifecycle",
  title: "MonoBehaviour lifecycle",
  intro:
    "The order Unity calls these in, roughly top to bottom. You won't use all of them in one script — add only what you need.",
  entries: [
    {
      term: "Awake()",
      description: "Runs once, right when the script/object is loaded — before Start, even if the object starts disabled. Good for setup that other scripts might depend on.",
    },
    {
      term: "OnEnable()",
      description: "Runs every time the object becomes active/enabled, including after being disabled and re-enabled.",
    },
    {
      term: "Start()",
      description: "Runs once, right before the first frame's Update — after every object's Awake has already run. The usual place to set up initial state.",
    },
    {
      term: "FixedUpdate()",
      description: "Runs on a fixed timer (independent of frame rate) — this is where physics code (Rigidbody forces, movement) belongs.",
    },
    {
      term: "Update()",
      description: "Runs once per frame. The most common place for input checks, timers, and general game logic.",
    },
    {
      term: "LateUpdate()",
      description: "Runs once per frame, after every Update has finished. Good for camera-follow code, so it moves after the player already has.",
    },
    {
      term: "OnCollisionEnter(Collision c)",
      description: "A non-trigger collider starts touching another. Also: OnCollisionStay, OnCollisionExit.",
    },
    {
      term: "OnTriggerEnter(Collider c)",
      description: "Another collider (marked \"Is Trigger\") enters this one. Also: OnTriggerStay, OnTriggerExit.",
    },
    {
      term: "OnDisable()",
      description: "Runs when the object becomes inactive/disabled.",
    },
    {
      term: "OnDestroy()",
      description: "Runs right before the object is destroyed (Destroy() was called, or the Scene is closing). Good for cleanup.",
    },
  ],
};

export const TIPS_SECTION: CheatSection = {
  id: "tips",
  title: "Quick tips",
  entries: [
    { term: "= vs ==", description: "= assigns a value. == compares two values. Mixing these up is the #1 cause of \"why doesn't my if work\" bugs." },
    { term: "Every statement ends in ;", description: "Except lines that open a block with { — those never get a semicolon." },
    { term: "Case matters", description: "myScore and myscore are two different variables. Console.WriteLine, not console.writeline." },
    { term: "Curly braces {} come in pairs", description: "Every { needs a matching }. A missing one usually breaks everything below it, not just that block." },
    { term: "Comments", description: "// for one line, /* ... */ for a block. The compiler ignores them completely — use them to explain why, not what." },
  ],
};
