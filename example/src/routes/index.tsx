// import {server, serverFetch, onMount} from 'armature-core'
export default () => {
    // const { data } = await server.index.get();

    // (async () => {
    //     const { data } = await serverFetch('/api/users', {
    //         method: 'POST',
    //         params: {
    //             name: 'Saori'
    //         },
    //         body: {
    //             branch: 'Arius',
    //             type: 'Striker'
    //         }
    //     });
    //     console.log(data);
    // })();


    // (async () => {
    //     let response = await fetch('/api')
    //     console.log(response)
    // })();

    // onMount(() => {
    //     console.log('Component mounted');
    //     const handler = () => console.log('Window resized');
    //     window.addEventListener('resize', handler);
    
    //     // Optional cleanup function
    //     return () => {
    //       window.removeEventListener('resize', handler);
    //     };
    // }, []);

    let name = "Tanner"
    let num = 9
    console.log(num)
    const result = fetch('/api').then(async data => {
        let r = await data.json()
        console.log(r)
    })
    // console.log(result)
  return (
    <div style="display: flex; flex-direction: column; height: 100vh; justify-content: space-between;">
      <header id="id">
        <h1>Welcome, {name}, to Reactive</h1>
      </header>

      <main>
        <p>
          This app was generated using <code>generate-reactive-app</code>.
        </p>
        <button>Get Started</button>
        <section className="mt-2">
          <h3>Features</h3>
          <p>
            Explore our features and see what makes us stand out. 
          </p>
        </section>
      </main>
      <footer>
        <p>&copy; 2024 Tanner Cottle. All rights reserved.</p>
      </footer>
    </div>
  )
}
