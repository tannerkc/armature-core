import Reactive from 'framework'
function index() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", justifyContent: "space-between"}}>
      <header>
        <h1>Welcome to Reactive</h1>
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

export default index
