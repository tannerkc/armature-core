# Armature: Fullstack Framework

To use:

```bash
bunx create-armature-app ./project-name
```

## JSX to HTML

Armature uses my custom JSX runtime called [effective-jsx](https://github.com/tannerkc/effective-jsx) that enables JSX without React. Being server-side rendered (SSR) as HTML means:

- `className` reverts to `class`
- `style` needs to be a string, not an object
- The DOM is simpler to interact with, eliminating the need for `useRef()`

## Lifecycle

Use `onMount` for DOM manipulation:

```typescript
onMount(() => {
    document.querySelector('.class').innerHTML = "Hello World";
})
```

## Signal-based Reactivity

Armature's reactivity system is designed to be familiar while leveraging the efficient Signals pattern.

### useState() and useEffect()

These functions are similar to React hooks but with some key differences:

```typescript
import { useState, useEffect } from 'armature-core'

export default () => {
    const [count, setCount] = useState<number>(0) // signal-based -> the getter must be called: count()

    useEffect(() => {
        console.log(`Count: ${count()}`)
    }) // optional: [dep] - a dependency array can be used for effects without signals
}
```

When state changes, only subscribers are updated, avoiding full component re-renders.

Note: Do not call the getter inside your JSX. They only need be called in your JavaScript, but the JSX Runtime calls the Signals for you.

```JSX
    return (<p>{count}</p>)
```

## API Layer

Armature provides a streamlined API layer for seamless client-server communication:

```typescript
// ./src/api/users/[userid]/index.ts
import { t } from 'armature-core/api'

const users = [
    {
        id: '123',
        name: 'John Smith',
    }
]

export const GET = {
    handler: async (context: { request: { url: any; }; params: { userid: string } }) => {
        return new Response(JSON.stringify({ user: users.find(user => user.id === context.params.userid) }), {
            headers: { 'Content-Type': 'application/json' },
        });
    },
    document: {
        detail: {
            summary: 'GET request for users',
            tags: ['Users']
        }
    },
};

// ./src/api/users/index.ts
export const POST = {
    handler: async (context: { request: { url: any; }; body: { userid: string } }) => {
        return new Response(JSON.stringify({ user: users.find(user => user.id === context.body.userid) }), {
            headers: { 'Content-Type': 'application/json' },
        });
    },
    document: {
        body: t.Object(
            {
                userid: t.String()
            },
            {
                description: 'Expected a user ID'
            }
        ),
        detail: {
            summary: 'GET request for users',
            tags: ['Users']
        }
    },
};

// ./src/routes/user/[userid]/index.tsx
import { useState, useEffect } from 'armature-core'

export default async ({ userid }) => {
    const [user, setUser] = useState([])

    const { data: user } = await server.users({ userid }).get();
    setUser(user)

    return (
        <p>
            {user.name}
        </p>
    )
}
```

## Automatic API Documentation

Scalar generates API documentation automatically based on your server-side functions.

## Websocket

__TODO__

## Lightweight and Fast

Armature is designed for optimal performance:

- **Efficient Updates**: Signal-based reactivity ensures minimal DOM updates
- **Fast SSR**: Server-side rendering is optimized for quick initial loads


Note: This framework was developed as an exploratory project to deepen understanding of rendering and runtimes. While not initially intended as a production-ready solution, it has proven effective and reliable for personal projects. I cannot advise using for production.

Collaboration and suggestions for improvements are welcome. Although full-time maintenance is currently not possible, continued development with sponsor support is an exciting prospect. With two months of dedicated effort invested, I am excited to see this framework evolve and reach its full potential.
