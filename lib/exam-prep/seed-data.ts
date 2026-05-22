// Starter content for the Unity Certified Associate Programmer exam-prep
// section. Loaded into the database by seedExamPrepContent() — once it's
// in the database it can be edited and expanded from there.

export type SeedGlossaryTerm = { term: string; definition: string };

export type SeedQuestion = {
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct: "a" | "b" | "c" | "d";
  explanation: string;
  category: string;
};

export type SeedCodeExample = {
  title: string;
  description: string;
  code: string;
  category: string;
};

// =============================================================
// Glossary
// =============================================================

export const SEED_GLOSSARY: SeedGlossaryTerm[] = [
  {
    term: "GameObject",
    definition:
      "The fundamental object in a Unity scene. On its own it does nothing — all of its behavior comes from the Components attached to it.",
  },
  {
    term: "Component",
    definition:
      "A piece of functionality attached to a GameObject (Transform, Rigidbody, a script, and so on). GameObjects are containers for Components.",
  },
  {
    term: "MonoBehaviour",
    definition:
      "The base class every Unity script inherits from. It lets a script attach to a GameObject and receive event messages such as Start and Update.",
  },
  {
    term: "Transform",
    definition:
      "The Component that stores a GameObject's position, rotation, and scale, plus its parent/child relationships. Every GameObject has exactly one.",
  },
  {
    term: "Prefab",
    definition:
      "A reusable, saved GameObject template stored as an asset. Instances can be placed in scenes or spawned at runtime with Instantiate.",
  },
  {
    term: "Scene",
    definition:
      "A file containing a set of GameObjects — a level, menu, or screen. A game is built from one or more scenes.",
  },
  {
    term: "Rigidbody",
    definition:
      "The Component that hands a GameObject to the physics engine, giving it mass, gravity, and movement driven by forces.",
  },
  {
    term: "Collider",
    definition:
      "A Component that defines a GameObject's shape for physics. Without a Collider, objects pass straight through each other.",
  },
  {
    term: "Trigger",
    definition:
      "A Collider with 'Is Trigger' enabled. It detects overlaps through OnTriggerEnter without producing a physical collision.",
  },
  {
    term: "Vector3",
    definition:
      "A struct holding three float values (x, y, z). Used for positions, directions, and scale in 3D space.",
  },
  {
    term: "Quaternion",
    definition:
      "Unity's representation of rotations. It avoids the gimbal-lock problems of raw Euler angles; build one with Quaternion.Euler.",
  },
  {
    term: "Coroutine",
    definition:
      "A method that can pause and resume across frames using yield. Started with StartCoroutine — ideal for timed sequences.",
  },
  {
    term: "Awake()",
    definition:
      "A lifecycle method called once when the script instance loads, before Start. Used for early setup and caching references.",
  },
  {
    term: "Start()",
    definition:
      "A lifecycle method called once on the first frame the script is active, after Awake. Used for setup that depends on other objects.",
  },
  {
    term: "Update()",
    definition:
      "A lifecycle method called once every frame. Most game logic and input polling happens here.",
  },
  {
    term: "FixedUpdate()",
    definition:
      "A lifecycle method called on a fixed timestep, independent of frame rate. Used for physics — applying forces to Rigidbodies.",
  },
  {
    term: "LateUpdate()",
    definition:
      "A lifecycle method called every frame after all Update calls have run. Commonly used for camera-follow logic.",
  },
  {
    term: "Instantiate()",
    definition:
      "Creates a copy of a GameObject or Prefab at runtime, optionally at a given position and rotation.",
  },
  {
    term: "Destroy()",
    definition:
      "Removes a GameObject or Component. An optional second argument delays removal by a number of seconds.",
  },
  {
    term: "[SerializeField]",
    definition:
      "An attribute that exposes a private field in the Inspector without having to make it public.",
  },
  {
    term: "Time.deltaTime",
    definition:
      "The seconds elapsed since the last frame. Multiply movement by it to keep speed independent of frame rate.",
  },
  {
    term: "Input",
    definition:
      "The class for reading keyboard, mouse, and controller state — for example Input.GetKeyDown or Input.GetAxis.",
  },
  {
    term: "Raycast",
    definition:
      "Casting an invisible ray into the scene to detect what it hits. Used for shooting, selection, and ground checks.",
  },
  {
    term: "Tag",
    definition:
      "A label assigned to GameObjects so scripts can identify them — for example with CompareTag(\"Player\").",
  },
  {
    term: "Layer",
    definition:
      "A category assigned to GameObjects, used to control which objects collide and what each camera renders.",
  },
  {
    term: "Camera",
    definition:
      "The Component that captures and displays the scene to the player. Every scene needs at least one.",
  },
  {
    term: "Canvas",
    definition:
      "The root Component for all Unity UI. Every UI element — buttons, text, images — must be a child of a Canvas.",
  },
  {
    term: "ScriptableObject",
    definition:
      "A data-container asset that lives outside any scene. Great for shared configuration and data-driven design.",
  },
  {
    term: "GetComponent()",
    definition:
      "Returns a reference to a Component of a given type on a GameObject, e.g. GetComponent<Rigidbody>(). Returns null if none is attached.",
  },
  {
    term: "Debug.Log()",
    definition:
      "Prints a message to the Unity Console — the primary tool for inspecting values and tracing how a script runs.",
  },
];

// =============================================================
// Question bank
// =============================================================

export const SEED_QUESTIONS: SeedQuestion[] = [
  {
    question: "Which MonoBehaviour method runs once on every frame?",
    choice_a: "Awake()",
    choice_b: "Start()",
    choice_c: "Update()",
    choice_d: "FixedUpdate()",
    correct: "c",
    explanation:
      "Update() is called once per frame and is where most per-frame game logic and input polling lives. Awake and Start run only once; FixedUpdate runs on the physics timestep.",
    category: "Scripting & C#",
  },
  {
    question:
      "To move an object at a constant speed regardless of frame rate, what should you multiply the movement by?",
    choice_a: "Time.time",
    choice_b: "Time.deltaTime",
    choice_c: "Time.frameCount",
    choice_d: "1 / 60",
    correct: "b",
    explanation:
      "Time.deltaTime is the seconds since the last frame. Multiplying by it makes movement frame-rate independent, so it looks the same at 30 or 144 FPS.",
    category: "Scripting & C#",
  },
  {
    question: "What does the [SerializeField] attribute do?",
    choice_a: "Makes a public field hidden from other scripts",
    choice_b: "Shows a private field in the Inspector",
    choice_c: "Saves a field to a file automatically",
    choice_d: "Marks a method as a coroutine",
    correct: "b",
    explanation:
      "[SerializeField] exposes a private field in the Inspector so you can assign it in the Editor, without breaking encapsulation by making it public.",
    category: "Scripting & C#",
  },
  {
    question:
      "Which method is the correct place to apply forces to a Rigidbody?",
    choice_a: "Update()",
    choice_b: "LateUpdate()",
    choice_c: "FixedUpdate()",
    choice_d: "Start()",
    correct: "c",
    explanation:
      "FixedUpdate() runs on the fixed physics timestep, so physics code — including AddForce — belongs there for stable, consistent results.",
    category: "Scripting & C#",
  },
  {
    question:
      "A C# class must inherit from which base class to be attachable to a GameObject as a script?",
    choice_a: "GameObject",
    choice_b: "ScriptableObject",
    choice_c: "Component",
    choice_d: "MonoBehaviour",
    correct: "d",
    explanation:
      "Scripts attached to GameObjects inherit from MonoBehaviour, which provides the lifecycle messages (Awake, Start, Update, …).",
    category: "Scripting & C#",
  },
  {
    question: "Which Component does every GameObject always have?",
    choice_a: "Rigidbody",
    choice_b: "Transform",
    choice_c: "Collider",
    choice_d: "Renderer",
    correct: "b",
    explanation:
      "Every GameObject has a Transform — it stores position, rotation, scale, and hierarchy. It cannot be removed.",
    category: "GameObjects & Components",
  },
  {
    question:
      "What is the correct way to get the Rigidbody attached to the same GameObject as the script?",
    choice_a: "new Rigidbody()",
    choice_b: "GetComponent<Rigidbody>()",
    choice_c: "FindObjectOfType<Transform>()",
    choice_d: "Instantiate(Rigidbody)",
    correct: "b",
    explanation:
      "GetComponent<T>() returns the Component of type T on that GameObject. Unity Components are never created with 'new'.",
    category: "GameObjects & Components",
  },
  {
    question: "What does Instantiate() do?",
    choice_a: "Deletes a GameObject from the scene",
    choice_b: "Creates a copy of a GameObject or Prefab at runtime",
    choice_c: "Pauses the game",
    choice_d: "Loads a new scene",
    correct: "b",
    explanation:
      "Instantiate() clones a GameObject or Prefab while the game is running — the standard way to spawn bullets, enemies, or pickups.",
    category: "GameObjects & Components",
  },
  {
    question: "A Prefab is best described as:",
    choice_a: "A compiled C# script",
    choice_b: "A reusable, saved GameObject template stored as an asset",
    choice_c: "A type of Collider",
    choice_d: "A lighting setting",
    correct: "b",
    explanation:
      "A Prefab is a saved GameObject template. Edit the Prefab asset once and every instance updates.",
    category: "GameObjects & Components",
  },
  {
    question:
      "You drag a script onto a GameObject but nothing happens at runtime. Which is the most likely cause?",
    choice_a: "The script has no Update or Start logic, or the GameObject is inactive",
    choice_b: "Scripts cannot be attached to GameObjects",
    choice_c: "The GameObject is missing its Transform",
    choice_d: "Prefabs disable all scripts",
    correct: "a",
    explanation:
      "A script only does something if it contains logic in lifecycle methods and its GameObject is active and enabled.",
    category: "GameObjects & Components",
  },
  {
    question:
      "For a GameObject to fall under gravity and react to forces, which Component must it have?",
    choice_a: "Collider",
    choice_b: "Rigidbody",
    choice_c: "Animator",
    choice_d: "Canvas",
    correct: "b",
    explanation:
      "A Rigidbody hands the object to the physics engine, giving it gravity, mass, and force-based movement.",
    category: "Physics & Collision",
  },
  {
    question:
      "Two GameObjects pass straight through each other instead of colliding. What is most likely missing?",
    choice_a: "A script",
    choice_b: "A Collider on one or both objects",
    choice_c: "A Camera",
    choice_d: "A Tag",
    correct: "b",
    explanation:
      "Colliders define the physical shape used for collisions. Without a Collider, objects have nothing to collide with.",
    category: "Physics & Collision",
  },
  {
    question:
      "A Collider has 'Is Trigger' enabled. Which method detects another object entering it?",
    choice_a: "OnCollisionEnter()",
    choice_b: "OnTriggerEnter()",
    choice_c: "OnMouseDown()",
    choice_d: "OnEnable()",
    correct: "b",
    explanation:
      "Trigger colliders report overlaps through OnTriggerEnter/Stay/Exit. OnCollisionEnter is for solid, non-trigger collisions.",
    category: "Physics & Collision",
  },
  {
    question:
      "Which method fires when two solid (non-trigger) colliders physically collide?",
    choice_a: "OnTriggerEnter()",
    choice_b: "OnCollisionEnter()",
    choice_c: "OnControllerColliderHit()",
    choice_d: "OnParticleCollision()",
    correct: "b",
    explanation:
      "OnCollisionEnter() runs for physical collisions between non-trigger colliders, and gives you a Collision object with contact details.",
    category: "Physics & Collision",
  },
  {
    question:
      "Casting an invisible ray into the scene to find out what it hits is called:",
    choice_a: "A Raycast",
    choice_b: "A Coroutine",
    choice_c: "Rasterizing",
    choice_d: "Baking",
    correct: "a",
    explanation:
      "A Raycast sends a ray from a point in a direction and reports the first Collider it hits — used for shooting, selection, and ground checks.",
    category: "Physics & Collision",
  },
  {
    question:
      "Which Editor panel shows and lets you edit the Components of the selected GameObject?",
    choice_a: "Hierarchy",
    choice_b: "Project",
    choice_c: "Inspector",
    choice_d: "Console",
    correct: "c",
    explanation:
      "The Inspector displays the Components and properties of whatever is currently selected.",
    category: "Unity Editor",
  },
  {
    question: "What does a Scene file contain?",
    choice_a: "Only C# scripts",
    choice_b: "A set of GameObjects making up a level or screen",
    choice_c: "The project's build settings",
    choice_d: "Texture compression options",
    correct: "b",
    explanation:
      "A Scene holds the GameObjects for one level, menu, or screen. Games are assembled from one or more scenes.",
    category: "Unity Editor",
  },
  {
    question:
      "To identify a GameObject in code by a label you assigned in the Editor, you use a:",
    choice_a: "Layer",
    choice_b: "Tag",
    choice_c: "Namespace",
    choice_d: "Prefab",
    correct: "b",
    explanation:
      "Tags label GameObjects so scripts can recognize them — for example gameObject.CompareTag(\"Player\").",
    category: "Unity Editor",
  },
  {
    question: "The Hierarchy window shows:",
    choice_a: "Every asset in the project",
    choice_b: "The GameObjects in the current scene",
    choice_c: "The console output",
    choice_d: "The animation timeline",
    correct: "b",
    explanation:
      "The Hierarchy lists the GameObjects in the open scene and their parent/child relationships. The Project window lists assets.",
    category: "Unity Editor",
  },
  {
    question:
      "Where do you control which categories of objects are allowed to collide?",
    choice_a: "The Layer Collision Matrix in Physics settings",
    choice_b: "The Lighting window",
    choice_c: "The Animator Controller",
    choice_d: "The Build Settings",
    correct: "a",
    explanation:
      "Layers plus the Layer Collision Matrix (Project Settings → Physics) decide which layers interact.",
    category: "Unity Editor",
  },
  {
    question: "Every Unity UI element must be a child of a:",
    choice_a: "Camera",
    choice_b: "Canvas",
    choice_c: "Rigidbody",
    choice_d: "Terrain",
    correct: "b",
    explanation:
      "All UI elements (Button, Text, Image, …) must live under a Canvas, which handles UI rendering and layout.",
    category: "UI & Animation",
  },
  {
    question: "The Animator Component plays animations driven by:",
    choice_a: "A Rigidbody",
    choice_b: "An Animator Controller (a state machine)",
    choice_c: "A Coroutine",
    choice_d: "A ScriptableObject",
    correct: "b",
    explanation:
      "An Animator Controller is a state machine of animation states and transitions; the Animator Component plays it.",
    category: "UI & Animation",
  },
  {
    question:
      "How do you make a UI Button run a method when the player clicks it?",
    choice_a: "Add the method to Update()",
    choice_b: "Wire the method into the Button's OnClick event",
    choice_c: "Tag the button 'Clickable'",
    choice_d: "Give the button a Rigidbody",
    correct: "b",
    explanation:
      "A Button exposes an OnClick UnityEvent. Drag in the target object and pick the method to call.",
    category: "UI & Animation",
  },
  {
    question:
      "In an Animator Controller, what moves the character from one animation state to another?",
    choice_a: "Transitions, often gated by parameters",
    choice_b: "Colliders",
    choice_c: "Raycasts",
    choice_d: "Tags",
    correct: "a",
    explanation:
      "Transitions connect states and fire when their conditions (Animator parameters such as bools or triggers) are met.",
    category: "UI & Animation",
  },
];

// =============================================================
// Code examples
// =============================================================

export const SEED_CODE_EXAMPLES: SeedCodeExample[] = [
  {
    title: "Move a player with the keyboard",
    description:
      "Reads horizontal/vertical input and moves the object. Multiplying by Time.deltaTime keeps the speed frame-rate independent.",
    category: "Scripting & C#",
    code: `using UnityEngine;

public class PlayerMovement : MonoBehaviour
{
    [SerializeField] private float speed = 5f;

    void Update()
    {
        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");

        Vector3 move = new Vector3(h, 0f, v);
        transform.Translate(move * speed * Time.deltaTime);
    }
}`,
  },
  {
    title: "Jump with a Rigidbody",
    description:
      "Detects the jump key in Update, then applies an upward impulse in FixedUpdate — the correct place for physics forces.",
    category: "Physics & Collision",
    code: `using UnityEngine;

public class Jump : MonoBehaviour
{
    [SerializeField] private float jumpForce = 7f;
    private Rigidbody rb;
    private bool jumpQueued;

    void Awake()
    {
        rb = GetComponent<Rigidbody>();
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.Space))
            jumpQueued = true;
    }

    void FixedUpdate()
    {
        if (jumpQueued)
        {
            rb.AddForce(Vector3.up * jumpForce, ForceMode.Impulse);
            jumpQueued = false;
        }
    }
}`,
  },
  {
    title: "Spawn a prefab at runtime",
    description:
      "A prefab is assigned in the Inspector via a [SerializeField] field, then Instantiate() creates copies of it while the game runs.",
    category: "GameObjects & Components",
    code: `using UnityEngine;

public class Spawner : MonoBehaviour
{
    [SerializeField] private GameObject enemyPrefab;

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.E))
        {
            Instantiate(enemyPrefab, transform.position, Quaternion.identity);
        }
    }
}`,
  },
  {
    title: "Wait with a Coroutine",
    description:
      "A coroutine pauses between lines using yield. Here it waits two seconds before destroying the GameObject.",
    category: "Scripting & C#",
    code: `using System.Collections;
using UnityEngine;

public class SelfDestruct : MonoBehaviour
{
    void Start()
    {
        StartCoroutine(DestroyAfterDelay());
    }

    private IEnumerator DestroyAfterDelay()
    {
        yield return new WaitForSeconds(2f);
        Destroy(gameObject);
    }
}`,
  },
  {
    title: "Detect a trigger overlap",
    description:
      "With 'Is Trigger' enabled on the Collider, OnTriggerEnter fires when something overlaps. CompareTag checks what entered.",
    category: "Physics & Collision",
    code: `using UnityEngine;

public class Coin : MonoBehaviour
{
    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            Debug.Log("Coin collected!");
            Destroy(gameObject);
        }
    }
}`,
  },
  {
    title: "Raycast from the camera",
    description:
      "Casts a ray from the mouse position into the scene and logs whatever Collider it hits — the basis of click-to-select.",
    category: "Physics & Collision",
    code: `using UnityEngine;

public class ClickToSelect : MonoBehaviour
{
    void Update()
    {
        if (Input.GetMouseButtonDown(0))
        {
            Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);

            if (Physics.Raycast(ray, out RaycastHit hit))
            {
                Debug.Log("Clicked on " + hit.collider.name);
            }
        }
    }
}`,
  },
  {
    title: "Cache a component reference",
    description:
      "GetComponent is relatively slow, so call it once in Awake and reuse the cached reference every frame.",
    category: "GameObjects & Components",
    code: `using UnityEngine;

public class Health : MonoBehaviour
{
    private Renderer rend;
    private int hp = 100;

    void Awake()
    {
        rend = GetComponent<Renderer>();
    }

    public void TakeDamage(int amount)
    {
        hp -= amount;
        rend.material.color = Color.red;
        if (hp <= 0) Destroy(gameObject);
    }
}`,
  },
  {
    title: "Follow a target in LateUpdate",
    description:
      "Camera-follow logic runs in LateUpdate so it moves after the target has finished moving this frame — preventing jitter.",
    category: "Scripting & C#",
    code: `using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    [SerializeField] private Transform target;
    [SerializeField] private Vector3 offset = new Vector3(0f, 5f, -8f);

    void LateUpdate()
    {
        if (target == null) return;
        transform.position = target.position + offset;
        transform.LookAt(target);
    }
}`,
  },
];
