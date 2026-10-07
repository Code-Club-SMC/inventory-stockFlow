import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

/** const logout = useLogout();  <button onClick={logout}> */
export function useLogout() {
    const qc = useQueryClient();
    const navigate = useNavigate();

    return () => {
        localStorage.removeItem('token');
        // Without this, the next person to log in could briefly see the previous user's data.
        qc.clear();
        navigate('/login', { replace: true });
    };
}
