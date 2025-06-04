
"use client";

import React, { useState, useEffect } from 'react';
import { Timestamp, collection, doc, getDoc, updateDoc, arrayRemove, arrayUnion, writeBatch, documentId } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast'; // Use your custom toast hook
import { db } from '@/lib/firebase/firebase'; // Adjust the import path as needed
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// Assuming you have the CentreUser interface defined in db.ts or here
interface CentreUser {
  birthday: Timestamp | string | null;
  diet: string | null;
  id: string;
  name: string;
  role: "admin" | "carer" | "therapist";
}

export default function ManageSettingsPage() {
    const { toast } = useToast(); // Get the toast function from your hook
    const [users, setUsers] = useState<CentreUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [submittingUser, setSubmittingUser] = useState(false); // To track individual user operation loading
    const [userError, setUserError] = useState<string | null>(null);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<CentreUser | null>(null);

    // You'll need a way to get the centreId, maybe from the URL or context
    const centreId = 'vi'; // Replace with actual logic to get centreId

    useEffect(() => {
        const fetchUsers = async () => {
          try {
            setLoadingUsers(true);
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
            setUserError(`Error fetching users: ${err.message}`);
            console.error(err);
          } finally {
            setLoadingUsers(false);
          }
        };
      
        fetchUsers();
    }, [centreId]); // Refetch if centreId changes


    const addUser = async (newUser: CentreUser) => {
        try {
          setSubmittingUser(true);
          setUserError(null); // Clear previous errors
          const centreRef = doc(db, 'centres', centreId);
          await updateDoc(centreRef, {
            users: arrayUnion(newUser)
          });
          setUsers([...users, newUser]); // Optimistically update state
          setShowAddUserModal(false); // Close modal on success
          toast({ title: "Success", description: "User added successfully." });
        } catch (err: any) {
          setUserError(`Error adding user: ${err.message}`);
          toast({ title: "Error", description: `Error adding user: ${err.message}`, variant: "destructive" });
          console.error(err);
        } finally {
          setSubmittingUser(false);
        }
    };
      
    const updateUser = async (updatedUser: CentreUser) => {
        try {
          const centreRef = doc(db, 'centres', centreId);
          setSubmittingUser(true);
          setUserError(null); // Clear previous errors
          
          const userToUpdate = users.find(user => user.id === updatedUser.id);
          if (!userToUpdate) {
            throw new Error("User not found for update.");
          }

          const batch = writeBatch(db);
          batch.update(centreRef, {
            users: arrayRemove(userToUpdate) // Remove the old user object
          });
          batch.update(centreRef, {
            users: arrayUnion(updatedUser) // Add the updated user object
          });
          await batch.commit();
      
          setUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user)); 
          setEditingUser(null); 
          toast({ title: "Success", description: "User updated successfully." });
        } catch (err: any) {
          setUserError(`Error updating user: ${err.message}`);
          toast({ title: "Error", description: `Error updating user: ${err.message}`, variant: "destructive" });
          console.error(err);
        } finally {
          setSubmittingUser(false);
        }
    };
      
    const deleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
          const centreRef = doc(db, 'centres', centreId);
          setSubmittingUser(true);
          setUserError(null); 
          const userToRemove = users.find(user => user.id === userId);
          if (userToRemove) {
            await updateDoc(centreRef, {
              users: arrayRemove(userToRemove)
            });
            setUsers(users.filter(user => user.id !== userId)); 
            toast({ title: "Success", description: "User deleted successfully." });
          }
        } catch (err: any) {
          setUserError(`Error deleting user: ${err.message}`);
          toast({ title: "Error", description: `Error deleting user: ${err.message}`, variant: "destructive" });
          console.error(err);
        } finally {
          setSubmittingUser(false);
        }
    };

interface UserFormProps {
    onSubmitUser: (user: CentreUser) => void;
    onClose: () => void;
    submitting: boolean;
    initialUser?: CentreUser | null;
}

const UserForm: React.FC<UserFormProps> = ({ onSubmitUser, onClose, submitting, initialUser }) => {
    const [formData, setFormData] = useState<Omit<CentreUser, 'id'>>({
      name: initialUser?.name || '',
      birthday: initialUser?.birthday || null,
      diet: initialUser?.diet || null,
      role: initialUser?.role || 'carer',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const userWithId: CentreUser = {
          ...formData,
          id: initialUser?.id || doc(collection(db, 'centres', centreId, 'temp')).id 
      };
      onSubmitUser(userWithId);
    };
  
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateValue = e.target.value; // Date as string 'YYYY-MM-DD'
        if (dateValue) {
            setFormData({ ...formData, birthday: Timestamp.fromDate(new Date(dateValue)) });
        } else {
            setFormData({ ...formData, birthday: null });
        }
    };

    let birthdayString = '';
    if (formData.birthday) {
        if (formData.birthday instanceof Timestamp) {
            birthdayString = formData.birthday.toDate().toISOString().split('T')[0];
        } else if (typeof formData.birthday === 'string') {
            // Attempt to parse if it's a string already (e.g., from previous state)
            try {
                birthdayString = new Date(formData.birthday).toISOString().split('T')[0];
            } catch (e) { /* ignore if parsing fails, will remain empty */ }
        }
    }
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>{initialUser ? 'Edit User' : 'Add New User'}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div>
                        <Label htmlFor="birthday">Birthday</Label>
                        <Input id="birthday" type="date" name="birthday" value={birthdayString} onChange={handleDateChange} />
                    </div>
                    <div>
                        <Label htmlFor="diet">Diet</Label>
                        <Input id="diet" name="diet" value={formData.diet || ''} onChange={handleChange} placeholder="e.g., D1, D2" />
                    </div>
                    <div>
                        <Label htmlFor="role">Role</Label>
                        <Select name="role" value={formData.role} onValueChange={(value) => setFormData({...formData, role: value as CentreUser["role"] })}>
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="carer">Carer</SelectItem>
                                <SelectItem value="therapist">Therapist</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>{submitting ? (initialUser ? 'Updating...' : 'Adding...') : (initialUser ? 'Update User' : 'Add User')}</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
      </div>
    );
};
      
    return (
      <div className="container mx-auto pb-10">
        <Card className="w-full max-w-4xl mx-auto">
            <Header centre={centreId} title="Settings" />
            <CardContent className="grid gap-4 px-4 pt-4">
                <Tabs defaultValue="users" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="centres">Manage Centres</TabsTrigger>
                        <TabsTrigger value="users">Manage Users</TabsTrigger>
                        <TabsTrigger value="diets">Manage Diets</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    </TabsList>

                    <TabsContent value="centres">
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Manage Centres</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>Centre management functionality will be here.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users">
                        <Card className="mt-4">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Manage Centre Users</CardTitle>
                                <Button onClick={() => setShowAddUserModal(true)} disabled={submittingUser}>Add New User</Button>
                            </CardHeader>
                            <CardContent>
                                {loadingUsers && <p>Loading users...</p>}
                                {userError && <p className="text-red-500">{userError}</p>}
                                {!loadingUsers && users.length === 0 && <p>No users found for this centre.</p>}
                                {!loadingUsers && users.length > 0 && (
                                  <ul className="space-y-2">
                                    {users.map(user => (
                                      <li key={user.id} className="flex items-center justify-between p-2 border rounded-md">
                                        <div>
                                            <p className="font-semibold">{user.name} <span className="text-sm text-muted-foreground">({user.role})</span></p>
                                            {user.diet && <p className="text-xs text-muted-foreground">Diet: {user.diet}</p>}
                                            {user.birthday && <p className="text-xs text-muted-foreground">Birthday: {user.birthday instanceof Timestamp ? user.birthday.toDate().toLocaleDateString() : String(user.birthday)}</p>}
                                        </div>
                                        <div className="space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => setEditingUser(user)} disabled={submittingUser}>Edit</Button>
                                            <Button variant="destructive" size="sm" onClick={() => deleteUser(user.id)} disabled={submittingUser}>Delete</Button>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="diets">
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Manage Diets</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>Diet management functionality will be here.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications">
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Notifications Settings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>Notification settings functionality will be here.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {showAddUserModal && (
                    <UserForm
                      onSubmitUser={addUser}
                      onClose={() => setShowAddUserModal(false)}
                      submitting={submittingUser}
                    />
                )}
            
                {editingUser && (
                    <UserForm
                      initialUser={editingUser}
                      onSubmitUser={updateUser}
                      onClose={() => setEditingUser(null)}
                      submitting={submittingUser}
                    />
                )}
            </CardContent>
        </Card>
      </div>
    );
}
