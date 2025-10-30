function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert("Account Created Successfully!");
      window.location.href = "login.html";
    })
    .catch(err => alert(err.message));
}
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const loginButton = document.querySelector('button');
  
  // Disable button and show loading state
  loginButton.disabled = true;
  loginButton.textContent = 'Logging in...';

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Verify user is properly authenticated
      const user = userCredential.user;
      if (user) {
        console.log("Login successful, redirecting to dashboard...");
        window.location.href = "index.html";
      } else {
        throw new Error("User verification failed");
      }
    })
    .catch(err => {
      console.error("Login error:", err);
      alert(err.message);
      // Reset button state
      loginButton.disabled = false;
      loginButton.textContent = 'Login';
    });
}
