
"use client";

import React, { useState, useEffect } from 'react';
import { Timestamp, collection, doc, getDoc, updateDoc, arrayRemove, arrayUnion, writeBatch, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/firebase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface CentreUser {
  birthday: Timestamp | string | null;
  diet: string | null;
  id: string;
  name: string;
  role: "admin" | "carer" | "therapist";
}

interface Diet {
  id: string; // Document ID, e.g., "D1"
  description: string;
}

export default function ManageSettingsPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<CentreUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [submittingUser, setSubmittingUser] = useState(false);
    const [userError, setUserError] = useState<string | null>(null);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<CentreUser | null>(null);

    const [diets, setDiets] = useState<Diet[]>([]);
    const [loadingDiets, setLoadingDiets] = useState(true);
    const [submittingDiet, setSubmittingDiet] = useState(false);
    const [dietError, setDietError] = useState<string | null>(null);
    const [showDietFormModal, setShowDietFormModal] = useState(false);
    const [editingDiet, setEditingDiet] = useState<Diet | null>(null);

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
                setUsers([]);
              }
            } else {
              setUsers([]);
            }
          } catch (err: any) {
            setUserError(`Error fetching users: ${err.message}`);
            console.error(err);
          } finally {
            setLoadingUsers(false);
          }
        };
        fetchUsers();
    }, [centreId]);

    useEffect(() => {
        const fetchDiets = async () => {
            try {
                setLoadingDiets(true);
                setDietError(null);
                const dietsCollectionRef = collection(db, 'diets');
                const dietsSnapshot = await getDocs(dietsCollectionRef);
                const dietsList = dietsSnapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    description: docSnap.data().description || ''
                }));
                setDiets(dietsList.sort((a, b) => a.id.localeCompare(b.id)));
            } catch (err: any) {
                setDietError(`Error fetching diets: ${err.message}`);
                toast({ title: "Error", description: `Error fetching diets: ${err.message}`, variant: "destructive" });
                console.error(err);
            } finally {
                setLoadingDiets(false);
            }
        };
        fetchDiets();
    }, []);


    const addUser = async (newUser: CentreUser) => {
        try {
          setSubmittingUser(true);
          setUserError(null);
          const centreRef = doc(db, 'centres', centreId);
          await updateDoc(centreRef, {
            users: arrayUnion(newUser)
          });
          setUsers(prevUsers => [...prevUsers, newUser].sort((a,b) => a.name.localeCompare(b.name)));
          setShowAddUserModal(false);
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
          setUserError(null);
          
          const userToUpdate = users.find(user => user.id === updatedUser.id);
          if (!userToUpdate) {
            throw new Error("User not found for update.");
          }

          const batch = writeBatch(db);
          batch.update(centreRef, {
            users: arrayRemove(userToUpdate)
          });
          batch.update(centreRef, {
            users: arrayUnion(updatedUser)
          });
          await batch.commit();
      
          setUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user).sort((a,b) => a.name.localeCompare(b.name))); 
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

    const handleAddOrUpdateDiet = async (dietData: Diet) => {
        try {
            setSubmittingDiet(true);
            setDietError(null);
            const dietDocRef = doc(db, 'diets', dietData.id);
            await setDoc(dietDocRef, { description: dietData.description }); // setDoc handles both create and update

            if (editingDiet) { // If editing
                setDiets(diets.map(d => d.id === dietData.id ? dietData : d).sort((a,b) => a.id.localeCompare(b.id)));
                toast({ title: "Success", description: `Diet ${dietData.id} updated successfully.` });
            } else { // If adding new
                 // Check if diet ID already exists before adding to state
                if (diets.some(d => d.id === dietData.id)) {
                    // This case should ideally be prevented by form validation or handled if ID changed during edit
                    setDiets(diets.map(d => d.id === dietData.id ? dietData : d).sort((a,b) => a.id.localeCompare(b.id)));
                    toast({ title: "Success", description: `Diet ${dietData.id} (existing) updated successfully.` });
                } else {
                    setDiets(prevDiets => [...prevDiets, dietData].sort((a,b) => a.id.localeCompare(b.id)));
                    toast({ title: "Success", description: `Diet ${dietData.id} added successfully.` });
                }
            }
            setShowDietFormModal(false);
            setEditingDiet(null);
        } catch (err: any) {
            setDietError(`Error saving diet: ${err.message}`);
            toast({ title: "Error", description: `Error saving diet ${dietData.id}: ${err.message}`, variant: "destructive" });
            console.error(err);
        } finally {
            setSubmittingDiet(false);
        }
    };

    const handleDeleteDiet = async (dietId: string) => {
        if (!confirm(`Are you sure you want to delete diet ${dietId}?`)) return;
        try {
            setSubmittingDiet(true);
            setDietError(null);
            const dietDocRef = doc(db, 'diets', dietId);
            await deleteDoc(dietDocRef);
            setDiets(diets.filter(d => d.id !== dietId));
            toast({ title: "Success", description: `Diet ${dietId} deleted successfully.` });
        } catch (err: any) {
            setDietError(`Error deleting diet: ${err.message}`);
            toast({ title: "Error", description: `Error deleting diet ${dietId}: ${err.message}`, variant: "destructive" });
            console.error(err);
        } finally {
            setSubmittingDiet(false);
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
  
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateValue = e.target.value;
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
            try {
                birthdayString = new Date(formData.birthday).toISOString().split('T')[0];
            } catch (e) { /* ignore */ }
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
                        <Label htmlFor="diet">Diet Code (e.g., D1, D2)</Label>
                        <Input id="diet" name="diet" value={formData.diet || ''} onChange={handleChange} placeholder="e.g., D1, D2" />
                    </div>
                    <div>
                        <Label htmlFor="role">Role</Label>
                        <Select name="role" value={formData.role} onValueChange={(value) => handleSelectChange('role', value as CentreUser["role"] )}>
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

interface DietFormProps {
    onSubmitDiet: (diet: Diet) => void;
    onClose: () => void;
    submitting: boolean;
    initialDiet?: Diet | null;
}

const DietForm: React.FC<DietFormProps> = ({ onSubmitDiet, onClose, submitting, initialDiet }) => {
    const [id, setId] = useState(initialDiet?.id || '');
    const [description, setDescription] = useState(initialDiet?.description || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!id.trim() || !description.trim()) {
            toast({ title: "Validation Error", description: "Diet ID and Description cannot be empty.", variant: "destructive"});
            return;
        }
        onSubmitDiet({ id: id.trim().toUpperCase(), description: description.trim() });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{initialDiet ? `Edit Diet: ${initialDiet.id}` : 'Add New Diet'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="dietId">Diet ID (e.g., D1, VEG)</Label>
                            <Input 
                                id="dietId" 
                                name="dietId" 
                                value={id} 
                                onChange={(e) => setId(e.target.value)} 
                                required 
                                disabled={!!initialDiet} // Disable if editing
                                className={initialDiet ? "bg-muted" : ""}
                            />
                            {initialDiet && <p className="text-xs text-muted-foreground mt-1">Diet ID cannot be changed after creation.</p>}
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Input 
                                id="description" 
                                name="description" 
                                value={description} 
                                onChange={(e) => setDescription(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? (initialDiet ? 'Updating...' : 'Adding...') : (initialDiet ? 'Update Diet' : 'Add Diet')}
                                {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            </Button>
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
                                <Button onClick={() => { setEditingUser(null); setShowAddUserModal(true); }} disabled={submittingUser}>Add New User</Button>
                            </CardHeader>
                            <CardContent>
                                {loadingUsers && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                                {userError && <p className="text-red-500">{userError}</p>}
                                {!loadingUsers && users.length === 0 && <p>No users found for this centre.</p>}
                                {!loadingUsers && users.length > 0 && (
                                  <ul className="space-y-2">
                                    {users.map(user => (
                                      <li key={user.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-secondary/50">
                                        <div>
                                            <p className="font-semibold">{user.name} <span className="text-sm text-muted-foreground">({user.role})</span></p>
                                            {user.diet && <p className="text-xs text-muted-foreground">Diet Code: {user.diet}</p>}
                                            {user.birthday && <p className="text-xs text-muted-foreground">Birthday: {user.birthday instanceof Timestamp ? user.birthday.toDate().toLocaleDateString() : String(user.birthday)}</p>}
                                        </div>
                                        <div className="space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => { setEditingUser(user); setShowAddUserModal(true);}} disabled={submittingUser}>Edit</Button>
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
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Manage Diets</CardTitle>
                                <Button onClick={() => { setEditingDiet(null); setShowDietFormModal(true); }} disabled={submittingDiet}>Add New Diet</Button>
                            </CardHeader>
                            <CardContent>
                                {loadingDiets && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                                {dietError && <p className="text-red-500 py-2">{dietError}</p>}
                                {!loadingDiets && diets.length === 0 && <p>No diets found. Add one to get started!</p>}
                                {!loadingDiets && diets.length > 0 && (
                                  <ul className="space-y-2">
                                    {diets.map(diet => (
                                      <li key={diet.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-secondary/50">
                                        <div>
                                            <p className="font-semibold">{diet.id}</p>
                                            <p className="text-sm text-muted-foreground">{diet.description}</p>
                                        </div>
                                        <div className="space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => { setEditingDiet(diet); setShowDietFormModal(true); }} disabled={submittingDiet}>Edit</Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteDiet(diet.id)} disabled={submittingDiet}>Delete</Button>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
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
                      initialUser={editingUser}
                      onSubmitUser={editingUser ? updateUser : addUser}
                      onClose={() => { setShowAddUserModal(false); setEditingUser(null); }}
                      submitting={submittingUser}
                    />
                )}
            
                {showDietFormModal && (
                    <DietForm
                        initialDiet={editingDiet}
                        onSubmitDiet={handleAddOrUpdateDiet}
                        onClose={() => { setShowDietFormModal(false); setEditingDiet(null); }}
                        submitting={submittingDiet}
                    />
                )}
            </CardContent>
        </Card>
      </div>
    );
}
