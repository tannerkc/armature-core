import Reactive from 'framework'
function index() {
  return (
    <>
        <h1>Welcome to Reactive!</h1>
        <p>This is app was generated using generate-reactive-app.</p>
        <button onclick={() => alert('Clicked!')}>Click me</button>
        <div>
            <h2 class="header">Testing nested children</h2>
            <p>these h2 and p tags live in a nested div</p>
            <div>this is a thrice nested div</div>
            <p style="color: red">testing style attribute</p>
        </div>
    </>
  )
}

export default index
