import React, {useState,useEffect} from 'react';
import LoginForm from '../../components/login/index';


export default function Login() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

const validateRequiredFields = (user) => {
  return !(user.email === '' || user.password === '');

}

  const handleLogin = () => {
    let obj = {
      email: email,
      password: password,
      rememberMe: rememberMe
    };
    setUser(obj);
    if(validateRequiredFields(obj)){
      setIsLoggedIn(true);
      if(obj.rememberMe){
        localStorage.setItem('user', JSON.stringify(obj));
      }
      console.log('Logged in');
    }else{
      console.log('Please fill all the fields');
    }
  }
  //
  // const handleLogout = () => {
  //   setIsLoggedIn(false);
  //   localStorage.removeItem('token');
  // }

  return (
    <div className="App">
      {isLoggedIn ? <h1>Create Anther pages and routes</h1> :<LoginForm setEmail={setEmail} setPassword={setPassword} setRememberMe={setRememberMe} onSubmit={handleLogin}/>}
    </div>
  );
}
