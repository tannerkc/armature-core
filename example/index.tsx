import Reactive from "framework"
// TODO: testing with tsx, but change to Reactive initiateApp()
const App = () => (
    <div>
      <h1>Hello, Custom JSX!</h1>
      <p>This is a paragraph.</p>
      <button onclick={() => alert('Clicked!')}>Click me</button>
    </div>
);
  
const appElement = document.getElementById('app');
if (appElement) appElement.appendChild(App());

export default App;
