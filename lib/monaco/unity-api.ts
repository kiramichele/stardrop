/**
 * Unity API surface for L2 autocomplete in Monaco.
 *
 * This isn't a real C# language service — it's a hand-curated set of
 * common Unity types and members that Game Design 101 students reach
 * for most. The completion provider in setup.ts uses this data plus
 * heuristics (e.g. "if user typed `transform.`, they probably mean a
 * Transform instance") to feel like real autocomplete.
 *
 * To extend: add to UNITY_TYPES (or KEYWORDS for plain C#). To make a
 * new variable name resolve to a type (so `myThing.` autocompletes
 * the right members), add it to COMMON_VARIABLES.
 */

export type CompletionKind =
  | "class"
  | "method"
  | "property"
  | "field"
  | "event"
  | "enum";

export type UnityMember = {
  name: string;
  kind: CompletionKind;
  signature?: string;
  documentation?: string;
  insertText?: string; // supports Monaco snippet syntax: ${1:placeholder}
};

export type UnityType = {
  name: string;
  documentation?: string;
  staticMembers: UnityMember[];
  instanceMembers: UnityMember[];
};

// Common variable names that students use, mapped to the type they typically refer to.
// Used to resolve `varName.` -> instance members of the inferred type.
export const COMMON_VARIABLES: Record<string, string> = {
  gameObject: "GameObject",
  transform: "Transform",
  rigidbody: "Rigidbody",
  rb: "Rigidbody",
  collider: "Collider",
  col: "Collider",
  camera: "Camera",
  cam: "Camera",
  animator: "Animator",
  anim: "Animator",
  audioSource: "AudioSource",
  audio: "AudioSource",
  light: "Light",
  position: "Vector3",
  pos: "Vector3",
  velocity: "Vector3",
  vel: "Vector3",
  direction: "Vector3",
  dir: "Vector3",
};

export const UNITY_TYPES: UnityType[] = [
  // =============================================================
  // GameObject
  // =============================================================
  {
    name: "GameObject",
    documentation: "Base class for all entities in Unity Scenes.",
    staticMembers: [
      {
        name: "Find",
        kind: "method",
        signature: "static GameObject Find(string name)",
        documentation: "Finds a GameObject by name and returns it.",
        insertText: 'Find("${1:name}")',
      },
      {
        name: "FindWithTag",
        kind: "method",
        signature: "static GameObject FindWithTag(string tag)",
        documentation: "Returns one active GameObject tagged with the given tag.",
        insertText: 'FindWithTag("${1:tag}")',
      },
      {
        name: "FindGameObjectsWithTag",
        kind: "method",
        signature: "static GameObject[] FindGameObjectsWithTag(string tag)",
        documentation: "Returns an array of active GameObjects tagged tag.",
        insertText: 'FindGameObjectsWithTag("${1:tag}")',
      },
      {
        name: "Instantiate",
        kind: "method",
        signature: "static GameObject Instantiate(GameObject original)",
        documentation: "Clones the object and returns the clone.",
        insertText: "Instantiate(${1:prefab})",
      },
      {
        name: "Destroy",
        kind: "method",
        signature: "static void Destroy(Object obj, float t = 0.0f)",
        documentation: "Removes a GameObject, component or asset.",
        insertText: "Destroy(${1:obj})",
      },
    ],
    instanceMembers: [
      { name: "name", kind: "property", signature: "string name", documentation: "The name of the object." },
      { name: "tag", kind: "property", signature: "string tag", documentation: "The tag of this game object." },
      { name: "transform", kind: "property", signature: "Transform transform", documentation: "The Transform attached to this GameObject." },
      { name: "activeInHierarchy", kind: "property", signature: "bool activeInHierarchy", documentation: "Is the GameObject active in the Scene?" },
      { name: "activeSelf", kind: "property", signature: "bool activeSelf", documentation: "The local active state of this GameObject." },
      {
        name: "GetComponent",
        kind: "method",
        signature: "T GetComponent<T>()",
        documentation: "Returns the component of type T if attached, else null.",
        insertText: "GetComponent<${1:Type}>()",
      },
      {
        name: "AddComponent",
        kind: "method",
        signature: "T AddComponent<T>()",
        documentation: "Adds a component of type T to the GameObject.",
        insertText: "AddComponent<${1:Type}>()",
      },
      {
        name: "SetActive",
        kind: "method",
        signature: "void SetActive(bool value)",
        documentation: "Activates or deactivates the GameObject.",
        insertText: "SetActive(${1:true})",
      },
      {
        name: "CompareTag",
        kind: "method",
        signature: "bool CompareTag(string tag)",
        documentation: "Checks if this game object is tagged with tag.",
        insertText: 'CompareTag("${1:tag}")',
      },
    ],
  },

  // =============================================================
  // Transform
  // =============================================================
  {
    name: "Transform",
    documentation: "Position, rotation, and scale of an object.",
    staticMembers: [],
    instanceMembers: [
      { name: "position", kind: "property", signature: "Vector3 position", documentation: "The world space position of the Transform." },
      { name: "localPosition", kind: "property", signature: "Vector3 localPosition", documentation: "Position relative to parent." },
      { name: "rotation", kind: "property", signature: "Quaternion rotation", documentation: "World rotation as a Quaternion." },
      { name: "eulerAngles", kind: "property", signature: "Vector3 eulerAngles", documentation: "World rotation as Euler angles in degrees." },
      { name: "localScale", kind: "property", signature: "Vector3 localScale", documentation: "Scale relative to parent." },
      { name: "forward", kind: "property", signature: "Vector3 forward", documentation: "Blue axis (z) of the transform in world space." },
      { name: "right", kind: "property", signature: "Vector3 right", documentation: "Red axis (x) of the transform in world space." },
      { name: "up", kind: "property", signature: "Vector3 up", documentation: "Green axis (y) of the transform in world space." },
      { name: "parent", kind: "property", signature: "Transform parent", documentation: "The parent of the transform." },
      { name: "childCount", kind: "property", signature: "int childCount", documentation: "Number of children the parent Transform has." },
      {
        name: "Translate",
        kind: "method",
        signature: "void Translate(Vector3 translation)",
        documentation: "Moves the transform in the direction and distance of translation.",
        insertText: "Translate(${1:Vector3.zero})",
      },
      {
        name: "Rotate",
        kind: "method",
        signature: "void Rotate(Vector3 eulers)",
        documentation: "Applies a rotation in degrees around each axis.",
        insertText: "Rotate(${1:Vector3.zero})",
      },
      {
        name: "LookAt",
        kind: "method",
        signature: "void LookAt(Transform target)",
        documentation: "Rotates the transform so the forward vector points at target.",
        insertText: "LookAt(${1:target})",
      },
    ],
  },

  // =============================================================
  // Vector3
  // =============================================================
  {
    name: "Vector3",
    documentation: "Representation of 3D vectors and points.",
    staticMembers: [
      { name: "zero", kind: "property", signature: "static Vector3 zero", documentation: "Shorthand for Vector3(0, 0, 0)." },
      { name: "one", kind: "property", signature: "static Vector3 one", documentation: "Shorthand for Vector3(1, 1, 1)." },
      { name: "up", kind: "property", signature: "static Vector3 up", documentation: "Shorthand for Vector3(0, 1, 0)." },
      { name: "down", kind: "property", signature: "static Vector3 down", documentation: "Shorthand for Vector3(0, -1, 0)." },
      { name: "left", kind: "property", signature: "static Vector3 left", documentation: "Shorthand for Vector3(-1, 0, 0)." },
      { name: "right", kind: "property", signature: "static Vector3 right", documentation: "Shorthand for Vector3(1, 0, 0)." },
      { name: "forward", kind: "property", signature: "static Vector3 forward", documentation: "Shorthand for Vector3(0, 0, 1)." },
      { name: "back", kind: "property", signature: "static Vector3 back", documentation: "Shorthand for Vector3(0, 0, -1)." },
      {
        name: "Distance",
        kind: "method",
        signature: "static float Distance(Vector3 a, Vector3 b)",
        documentation: "Returns the distance between a and b.",
        insertText: "Distance(${1:a}, ${2:b})",
      },
      {
        name: "Lerp",
        kind: "method",
        signature: "static Vector3 Lerp(Vector3 a, Vector3 b, float t)",
        documentation: "Linearly interpolates between two vectors.",
        insertText: "Lerp(${1:a}, ${2:b}, ${3:t})",
      },
    ],
    instanceMembers: [
      { name: "x", kind: "field", signature: "float x", documentation: "X component of the vector." },
      { name: "y", kind: "field", signature: "float y", documentation: "Y component of the vector." },
      { name: "z", kind: "field", signature: "float z", documentation: "Z component of the vector." },
      { name: "magnitude", kind: "property", signature: "float magnitude", documentation: "Returns the length of this vector." },
      { name: "normalized", kind: "property", signature: "Vector3 normalized", documentation: "Returns this vector with a magnitude of 1." },
    ],
  },

  // =============================================================
  // Vector2
  // =============================================================
  {
    name: "Vector2",
    documentation: "Representation of 2D vectors and points.",
    staticMembers: [
      { name: "zero", kind: "property", signature: "static Vector2 zero" },
      { name: "one", kind: "property", signature: "static Vector2 one" },
      { name: "up", kind: "property", signature: "static Vector2 up" },
      { name: "down", kind: "property", signature: "static Vector2 down" },
      { name: "left", kind: "property", signature: "static Vector2 left" },
      { name: "right", kind: "property", signature: "static Vector2 right" },
    ],
    instanceMembers: [
      { name: "x", kind: "field", signature: "float x" },
      { name: "y", kind: "field", signature: "float y" },
      { name: "magnitude", kind: "property", signature: "float magnitude" },
      { name: "normalized", kind: "property", signature: "Vector2 normalized" },
    ],
  },

  // =============================================================
  // Rigidbody
  // =============================================================
  {
    name: "Rigidbody",
    documentation: "Control of an object's position through physics simulation.",
    staticMembers: [],
    instanceMembers: [
      { name: "velocity", kind: "property", signature: "Vector3 velocity", documentation: "The velocity vector of the rigidbody." },
      { name: "angularVelocity", kind: "property", signature: "Vector3 angularVelocity", documentation: "Angular velocity vector in radians per second." },
      { name: "mass", kind: "property", signature: "float mass", documentation: "The mass of the rigidbody." },
      { name: "useGravity", kind: "property", signature: "bool useGravity" },
      { name: "isKinematic", kind: "property", signature: "bool isKinematic" },
      {
        name: "AddForce",
        kind: "method",
        signature: "void AddForce(Vector3 force)",
        documentation: "Applies a force to the rigidbody.",
        insertText: "AddForce(${1:Vector3.up})",
      },
      {
        name: "AddTorque",
        kind: "method",
        signature: "void AddTorque(Vector3 torque)",
        insertText: "AddTorque(${1:Vector3.up})",
      },
      {
        name: "MovePosition",
        kind: "method",
        signature: "void MovePosition(Vector3 position)",
        insertText: "MovePosition(${1:position})",
      },
    ],
  },

  // =============================================================
  // Debug
  // =============================================================
  {
    name: "Debug",
    documentation: "Class containing methods to ease debugging.",
    staticMembers: [
      {
        name: "Log",
        kind: "method",
        signature: "static void Log(object message)",
        documentation: "Logs a message to the Unity Console.",
        insertText: "Log(${1:message})",
      },
      {
        name: "LogWarning",
        kind: "method",
        signature: "static void LogWarning(object message)",
        documentation: "Logs a warning message to the Console.",
        insertText: "LogWarning(${1:message})",
      },
      {
        name: "LogError",
        kind: "method",
        signature: "static void LogError(object message)",
        documentation: "Logs an error message to the Console.",
        insertText: "LogError(${1:message})",
      },
    ],
    instanceMembers: [],
  },

  // =============================================================
  // Input
  // =============================================================
  {
    name: "Input",
    documentation: "Interface into the Input system.",
    staticMembers: [
      {
        name: "GetKey",
        kind: "method",
        signature: "static bool GetKey(KeyCode key)",
        documentation: "Returns true while the user holds down the key.",
        insertText: "GetKey(${1:KeyCode.Space})",
      },
      {
        name: "GetKeyDown",
        kind: "method",
        signature: "static bool GetKeyDown(KeyCode key)",
        documentation: "Returns true the frame the user starts pressing the key.",
        insertText: "GetKeyDown(${1:KeyCode.Space})",
      },
      {
        name: "GetKeyUp",
        kind: "method",
        signature: "static bool GetKeyUp(KeyCode key)",
        documentation: "Returns true the frame the user releases the key.",
        insertText: "GetKeyUp(${1:KeyCode.Space})",
      },
      {
        name: "GetAxis",
        kind: "method",
        signature: "static float GetAxis(string axisName)",
        documentation: 'Returns the value of the virtual axis (e.g. "Horizontal").',
        insertText: 'GetAxis("${1:Horizontal}")',
      },
      {
        name: "GetMouseButton",
        kind: "method",
        signature: "static bool GetMouseButton(int button)",
        insertText: "GetMouseButton(${1:0})",
      },
      { name: "mousePosition", kind: "property", signature: "static Vector3 mousePosition" },
    ],
    instanceMembers: [],
  },

  // =============================================================
  // Time
  // =============================================================
  {
    name: "Time",
    documentation: "The interface to get time information from Unity.",
    staticMembers: [
      { name: "deltaTime", kind: "property", signature: "static float deltaTime", documentation: "The completion time in seconds since the last frame." },
      { name: "fixedDeltaTime", kind: "property", signature: "static float fixedDeltaTime", documentation: "The interval in seconds at which physics steps." },
      { name: "time", kind: "property", signature: "static float time", documentation: "Time at the beginning of this frame since game start." },
      { name: "timeScale", kind: "property", signature: "static float timeScale", documentation: "The scale at which time passes." },
    ],
    instanceMembers: [],
  },

  // =============================================================
  // Mathf
  // =============================================================
  {
    name: "Mathf",
    documentation: "A collection of common math functions.",
    staticMembers: [
      { name: "PI", kind: "property", signature: "const float PI" },
      { name: "Infinity", kind: "property", signature: "const float Infinity" },
      { name: "Abs", kind: "method", signature: "static float Abs(float f)", insertText: "Abs(${1:f})" },
      { name: "Sin", kind: "method", signature: "static float Sin(float f)", insertText: "Sin(${1:f})" },
      { name: "Cos", kind: "method", signature: "static float Cos(float f)", insertText: "Cos(${1:f})" },
      { name: "Tan", kind: "method", signature: "static float Tan(float f)", insertText: "Tan(${1:f})" },
      { name: "Sqrt", kind: "method", signature: "static float Sqrt(float f)", insertText: "Sqrt(${1:f})" },
      { name: "Pow", kind: "method", signature: "static float Pow(float f, float p)", insertText: "Pow(${1:f}, ${2:p})" },
      { name: "Min", kind: "method", signature: "static float Min(float a, float b)", insertText: "Min(${1:a}, ${2:b})" },
      { name: "Max", kind: "method", signature: "static float Max(float a, float b)", insertText: "Max(${1:a}, ${2:b})" },
      { name: "Clamp", kind: "method", signature: "static float Clamp(float value, float min, float max)", insertText: "Clamp(${1:value}, ${2:min}, ${3:max})" },
      { name: "Lerp", kind: "method", signature: "static float Lerp(float a, float b, float t)", insertText: "Lerp(${1:a}, ${2:b}, ${3:t})" },
      { name: "Round", kind: "method", signature: "static float Round(float f)", insertText: "Round(${1:f})" },
      { name: "Floor", kind: "method", signature: "static float Floor(float f)", insertText: "Floor(${1:f})" },
      { name: "Ceil", kind: "method", signature: "static float Ceil(float f)", insertText: "Ceil(${1:f})" },
    ],
    instanceMembers: [],
  },

  // =============================================================
  // Random
  // =============================================================
  {
    name: "Random",
    documentation: "Utility for generating random data.",
    staticMembers: [
      {
        name: "Range",
        kind: "method",
        signature: "static float Range(float min, float max)",
        documentation: "Returns a random float in [min, max).",
        insertText: "Range(${1:0f}, ${2:1f})",
      },
      { name: "value", kind: "property", signature: "static float value", documentation: "Returns a random number in [0, 1]." },
      { name: "insideUnitSphere", kind: "property", signature: "static Vector3 insideUnitSphere" },
      { name: "insideUnitCircle", kind: "property", signature: "static Vector2 insideUnitCircle" },
    ],
    instanceMembers: [],
  },

  // =============================================================
  // Color
  // =============================================================
  {
    name: "Color",
    documentation: "Representation of RGBA colors.",
    staticMembers: [
      { name: "red", kind: "property", signature: "static Color red" },
      { name: "green", kind: "property", signature: "static Color green" },
      { name: "blue", kind: "property", signature: "static Color blue" },
      { name: "white", kind: "property", signature: "static Color white" },
      { name: "black", kind: "property", signature: "static Color black" },
      { name: "yellow", kind: "property", signature: "static Color yellow" },
      { name: "cyan", kind: "property", signature: "static Color cyan" },
      { name: "magenta", kind: "property", signature: "static Color magenta" },
      { name: "clear", kind: "property", signature: "static Color clear" },
    ],
    instanceMembers: [
      { name: "r", kind: "field", signature: "float r" },
      { name: "g", kind: "field", signature: "float g" },
      { name: "b", kind: "field", signature: "float b" },
      { name: "a", kind: "field", signature: "float a" },
    ],
  },

  // =============================================================
  // MonoBehaviour (instance members are inherited)
  // =============================================================
  {
    name: "MonoBehaviour",
    documentation: "Base class from which every Unity script derives.",
    staticMembers: [],
    instanceMembers: [
      { name: "gameObject", kind: "property", signature: "GameObject gameObject", documentation: "The game object this component is attached to." },
      { name: "transform", kind: "property", signature: "Transform transform", documentation: "The Transform attached to this GameObject." },
      { name: "tag", kind: "property", signature: "string tag", documentation: "The tag of this game object." },
      { name: "enabled", kind: "property", signature: "bool enabled", documentation: "Enabled Behaviours are Updated, disabled ones are not." },
      {
        name: "GetComponent",
        kind: "method",
        signature: "T GetComponent<T>()",
        insertText: "GetComponent<${1:Type}>()",
      },
      {
        name: "Invoke",
        kind: "method",
        signature: "void Invoke(string methodName, float time)",
        insertText: 'Invoke("${1:methodName}", ${2:time})',
      },
      {
        name: "StartCoroutine",
        kind: "method",
        signature: "Coroutine StartCoroutine(IEnumerator routine)",
        insertText: "StartCoroutine(${1:routine})",
      },
    ],
  },

  // =============================================================
  // KeyCode (enum-like)
  // =============================================================
  {
    name: "KeyCode",
    documentation: "Key codes returned by Event.keyCode.",
    staticMembers: [
      "Space", "Return", "Escape", "Tab", "LeftShift", "RightShift", "LeftControl", "RightControl",
      "LeftAlt", "RightAlt", "UpArrow", "DownArrow", "LeftArrow", "RightArrow",
      "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
      "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
      "Alpha0", "Alpha1", "Alpha2", "Alpha3", "Alpha4", "Alpha5", "Alpha6", "Alpha7", "Alpha8", "Alpha9",
      "Mouse0", "Mouse1", "Mouse2",
    ].map((name) => ({ name, kind: "enum" as CompletionKind, signature: `KeyCode.${name}` })),
    instanceMembers: [],
  },
];

// =============================================================
// Snippets — full code patterns inserted on completion
// =============================================================
export const UNITY_SNIPPETS = [
  {
    label: "Start",
    documentation: "Start is called before the first frame update.",
    insertText: "void Start()\n{\n\t${0}\n}",
  },
  {
    label: "Update",
    documentation: "Update is called once per frame.",
    insertText: "void Update()\n{\n\t${0}\n}",
  },
  {
    label: "Awake",
    documentation: "Awake is called when the script instance is being loaded.",
    insertText: "void Awake()\n{\n\t${0}\n}",
  },
  {
    label: "FixedUpdate",
    documentation: "FixedUpdate is called every fixed framerate frame.",
    insertText: "void FixedUpdate()\n{\n\t${0}\n}",
  },
  {
    label: "OnTriggerEnter",
    documentation: "Called when this collider enters a trigger.",
    insertText: "void OnTriggerEnter(Collider other)\n{\n\t${0}\n}",
  },
  {
    label: "OnCollisionEnter",
    documentation: "Called when this collider starts touching another collider.",
    insertText: "void OnCollisionEnter(Collision collision)\n{\n\t${0}\n}",
  },
  {
    label: "MonoBehaviour class",
    documentation: "A new Unity script template.",
    insertText:
      "public class ${1:NewBehaviour} : MonoBehaviour\n{\n\tvoid Start()\n\t{\n\t\t${0}\n\t}\n\n\tvoid Update()\n\t{\n\t\t\n\t}\n}",
  },
];

// =============================================================
// C# keywords
// =============================================================
export const CSHARP_KEYWORDS = [
  "public", "private", "protected", "internal", "static", "readonly", "const",
  "void", "int", "float", "double", "bool", "string", "char", "byte",
  "class", "struct", "interface", "enum", "namespace", "using",
  "if", "else", "for", "foreach", "while", "do", "switch", "case", "break", "continue", "return",
  "new", "this", "base", "null", "true", "false",
  "var", "in", "out", "ref", "params",
  "try", "catch", "finally", "throw",
];