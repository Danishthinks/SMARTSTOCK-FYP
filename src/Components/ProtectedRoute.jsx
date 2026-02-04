import { Navigate } from 'react-router-dom';
import { useAuth } from '../Contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return currentUser ? children : <Navigate to="/" replace />;
}
