import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import NavigBar from './components/NavigBar'
import UserProfile from './components/UserProfile'
import MainDictionary from './pages/MainDictionary'
import InnerD from './pages/InnerD'
import Practice from './pages/Practice'
import WordDetails from './pages/WordDetails'
import Account from './pages/Account'
import Notifications from './pages/Notifications'
import Friends from './pages/Friends'
import ProtectedRoute from './components/ProtectedRoute'


function App() {
 
  
  return (
  <>
  
  <NavigBar/> 
  <UserProfile/>
    
  <Routes>

    <Route path='/' element={<Home/>}/>
    <Route path='/account' element={<Account/>}/>

    <Route path='/mainDictionary' element={
      <ProtectedRoute><MainDictionary/></ProtectedRoute>
    }/>
    <Route path='/InnerD/:id' element={
      <ProtectedRoute><InnerD/></ProtectedRoute>
    }/>
    <Route path='/practice' element={
      <ProtectedRoute><Practice/></ProtectedRoute>
    }/>
    <Route path='/practice/:id' element={
      <ProtectedRoute><Practice/></ProtectedRoute>
    }/>
    <Route path='/WordDetails/:id' element={
      <ProtectedRoute><WordDetails/></ProtectedRoute>
    }/>
    <Route path='/notifications' element={
      <ProtectedRoute><Notifications/></ProtectedRoute>
    }/>
    <Route path='/friends' element={
      <ProtectedRoute><Friends/></ProtectedRoute>
    }/>
  </Routes>


  </>

)
}

export default App

