"use client";

import React, { useState, useEffect } from 'react';
import { Timestamp, collection, doc, getDoc, updateDoc, arrayRemove, arrayUnion, writeBatch, documentId } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast'; // Use your custom toast hook
import { db } from '@/lib/firebase/firebase'; // Adjust the import path as needed
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/ui/header";

// Assuming you have the CentreUser interface defined in db.ts or here
interface CentreUser {
  birthday: Timestamp | string | null;
  diet: string | null;
  id: string;
  name: string;
  role: "admin" | "carer" | "therapist";
}

export default function ManageUsers() {
    const { toast } = useToast(); // Get the toast function from your hook
    const [users, setUsers] = useState<CentreUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false); // To track individual operation loading
    const [error, setError] = useState<string | null>(null);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<CentreUser | null>(null);

    // You'll need a way to get the centreId, maybe from the URL or context
    const centreId = 'vi'; // Replace with actual logic to get centreId

    useEffect(() => {
        const fetchUsers = async () => {
          try {
            setLoading(true);
            const centreRef = doc(db, 'centres', centreId);
            const centreDoc = await getDoc(centreRef);
      
            if (centreDoc.exists()) {
              const data = centreDoc.data();
              if (data && data.users) {
                setUsers(data.users);
              } else {
                setUsers([]); // No users field or empty array
              }
            } else {
              setUsers([]); // Centre document doesn't exist
            }
          } catch (err: any) {
            setError(`Error fetching users: ${err.message}`);
            //toast.error(`Error fetching users: ${err.message}`);
            console.error(err);
          } finally {
            setLoading(false);
          }
        };
      
        fetchUsers();
    }, [centreId]); // Refetch if centreId changes


    const addUser = async (newUser: CentreUser) => {
        try {
          setSubmitting(true);
          setError(null); // Clear previous errors
          const centreRef = doc(db, 'centres', centreId);
          await updateDoc(centreRef, {
            users: arrayUnion(newUser)
          });
          setUsers([...users, newUser]); // Optimistically update state
          setShowAddUserModal(false); // Close modal on success
        } catch (err: any) {
          setError(`Error adding user: ${err.message}`);
          console.error(err);
        }
    };
      
    const updateUser = async (updatedUser: CentreUser) => {
        try {
          const centreRef = doc(db, 'centres', centreId);
          setSubmitting(true);
          setError(null); // Clear previous errors
          // To update an item in an array, you typically remove the old one and add the new one
          const batch = writeBatch(db);
          batch.update(centreRef, {
            users: arrayRemove(users.find(user => user.id === updatedUser.id))
          });
          batch.update(centreRef, {
            users: arrayUnion(updatedUser)
          });
          await batch.commit();
      
          setUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user)); // Optimistically update state
          setEditingUser(null); // Close edit form
        } catch (err: any) {
          setError(`Error updating user: ${err.message}`);
          console.error(err);
        }
    };
      
    const deleteUser = async (userId: string) => {
        try {
          const centreRef = doc(db, 'centres', centreId);
          setSubmitting(true);
          setError(null); // Clear previous errors
          // Find the user object to remove based on ID
          const userToRemove = users.find(user => user.id === userId);
          if (userToRemove) {
            await updateDoc(centreRef, {
              users: arrayRemove(userToRemove)
            });
            setUsers(users.filter(user => user.id !== userId)); // Optimistically update state
          }
        } catch (err: any) {
          setError(`Error deleting user: ${err.message}`);
          console.error(err);
        }
    };

    // Example AddUserForm component (in the same file or a separate one)
interface AddUserFormProps {
    onAddUser: (newUser: CentreUser) => void;
    onClose: () => void;
  }

const AddUserForm: React.FC<AddUserFormProps & { submitting: boolean }> = ({ onAddUser, onClose, submitting }) => { // Added submitting prop
    const [formData, setFormData] = useState<Omit<CentreUser, 'id'>>({ // Omit id as it can be generated
      birthday: null,
      diet: null,
      name: '',
      role: 'carer', // Default role
    });
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Generate a unique ID for the new user (e.g., using uuid or a Firestore document ID)
      // It's better to generate the ID in the parent component or the addUser function
      // to avoid potential issues with temporary documents.
      // For now, keeping the logic here for simplicity but be mindful.
      // Using documentId() to generate a unique ID client-side
      const newUserWithId: CentreUser = {
          ...formData, // Include all form data
          id: doc(collection(db, 'centres', centreId, 'temp')).id // Generate ID
      };
      onClose();
    };
  
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    };
  
    return (
      <div className="modal">
        <h2>Add New User</h2>
        <form onSubmit={handleSubmit}>
          {/* Input fields for name, birthday, diet, role */}
          <input type="text" name="name" placeholder="Name" onChange={handleChange} required />
            <input type="date" name="birthday" onChange={handleChange} /> {/* Example birthday input */}
            {/* Add other input fields for diet, role */}
            {/* Example: <input type="date" name="birthday" onChange={handleChange} /> */}
          <button type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add User'}</button>
          <button onClick={onClose}>Cancel</button>
        </form>
      </div>
    );
};
  
// Example EditUserForm component (similar structure)
interface EditUserFormProps {
    user: CentreUser;
    onUpdateUser: (updatedUser: CentreUser) => void;
    onClose: () => void;
}
const EditUserForm: React.FC<EditUserFormProps & { submitting: boolean }> = ({ user, onUpdateUser, onClose, submitting }) => { // Added submitting prop
    const [formData, setFormData] = useState<CentreUser>(user);
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onUpdateUser(formData);
    };
  
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    };
  
    return (
      <div className="modal">
        <h2>Edit User</h2>
          <form onSubmit={handleSubmit}>
          {/* Input fields for name, birthday, diet, role (pre-filled with user data) */}
            <input type="hidden" name="id" value={formData.id} /> {/* Keep the user ID */}
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            <input type="date" name="birthday" value={typeof formData.birthday === 'string' ? formData.birthday : formData.birthday?.toDate().toISOString().split('T')[0] || ''} onChange={handleChange} /> {/* Example birthday input */}
          {/* Add other input fields */}
          <button type="submit">Update User</button>
          <button onClick={onClose}>Cancel</button>
        </form>
      </div>
    );
  };


    if (loading) {
        return <p>Loading users...</p>; // Simple loading indicator for initial fetch
    }

      
    if (error) {
        return <p>Error: {error}</p>;
    }
      
    return (
      <div className="container mx-auto pb-10">
      <Card className="w-full max-w-4xl mx-auto">
        <Header centre="" title="Settings" />
        <CardContent className="grid gap-4 px-4">
        <section className="grid gap-2 pt-4">
          <div className="flex flex-col justify-between items-center gap-4 flex-wrap ">
            

            

            
          <h1>Manage Centre Users</h1>
          <button onClick={() => setShowAddUserModal(true)}>Add New User</button>
      
          {/* Display the list of users */}
          <ul>
            {users.map(user => (
              <li key={user.id} className="user-item"> {/* Added class for potential styling */}
                {user.name} - {user.role} {submitting && '...'}
                <button onClick={() => setEditingUser(user)} disabled={submitting}>Edit</button>
                <button onClick={() => deleteUser(user.id)} disabled={submitting}>Delete</button>
              </li>
            ))}
          </ul>

          {/* Display general error message */}
          {error && <p className="error-message">{error}</p>}
      
          {/* Add User Modal/Form (Implement this as a separate component or inline) */}
          {showAddUserModal && (
            <AddUserForm
              onAddUser={addUser}
              onClose={() => setShowAddUserModal(false)}
              submitting={submitting}
            />
          )}
      
          {/* Edit User Modal/Form (Implement this as a separate component or inline) */}
          {editingUser && (
            <EditUserForm
              user={editingUser}
              onUpdateUser={updateUser}
              submitting={submitting}
              onClose={() => setEditingUser(null)}
            />
          )}
        </div>
        </section>
        </CardContent>
        </Card>
        </div>
    );

}