# Armature: Fullstack Framework

To use:

```bash
bunx create-armature-app ./project-name
```

# JSX to HTML

This framework uses a custom JSX runtime called `effective-jsx` that enabled JSX without React.
Being SSR as HTML means `className` is back to just `class`, `style` needs to be a string, not an object, and the DOM is simpler to interact with rather than using `useRef()`. Use `onMount` for DOM manipulation.

```typescript
onMount(() => {
    document.querySelector('.class').innerHTML = "Hello World";
})
```

# Signal based reactivity

This was designed to look and feel familiar, and not create a learning curve. 

`useState()` and `useEffect()` 

These functions are very familiar with minor differences. The reactivity uses the `Signals` pattern.
When a state changes, only subscribers are updated, the components do not re-render.

```typescript
import { useState, useEffect } from 'armature-core'

export default () => {
    const [count, setCount] = useState<number>(0) // signal based -> the getter must be called: count()

    useEffect(() => {
        console.log(`Count: ${count()}`)
    }) // optional: [dep] - a dependency array can be used to run effects that don't contain a `signal`
}
```

# API layer

__HERE__

# Automatic API documentation

__HERE__

# Lightweight and fast

__HERE__


Note: I developed this framework as an exploratory project to deepen my understanding of rendering and runtimes. While it was not initially intended as a production-ready solution, it has proven to be effective and reliable for my personal projects, aligning with my preferred workflow.
I am open to collaboration and welcome suggestions for improvements, as I recognize that there is always room for growth and refinement. Although I am currently unable to maintain the project full-time, I am enthusiastic about the possibility of continued development with the support of sponsors. With two months of dedicated effort already invested, I am eager to see this framework evolve and reach its full potential.
