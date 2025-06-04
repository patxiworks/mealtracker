
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  id: string; 
  description: string;
  name?: string;
}

interface Centre {
  id: string; 
  name: string;
  code: string;
}

export default function ManageSettingsPage() {
    const { toast } = useToast();
    
    // User Management States
    const [users, setUsers] = useState<CentreUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false); 
    const [isUsersLoadingForSelectedCentre, setIsUsersLoadingForSelectedCentre] = useState(false); 
    const [submittingUser, setSubmittingUser] = useState(false);
    const [userError, setUserError] = useState<string | null>(null);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<CentreUser | null>(null);
    const [selectedCentreIdForUsers, setSelectedCentreIdForUsers] = useState<string | null>(null);
    const [selectedCentreNameForUsers, setSelectedCentreNameForUsers] = useState<string | null>(null);


    // Diet Management States
    const [diets, setDiets] = useState<Diet[]>([]);
    const [loadingDiets, setLoadingDiets] = useState(true);
    const [submittingDiet, setSubmittingDiet] = useState(false);
    const [dietError, setDietError] = useState<string | null>(null);
    const [showDietFormModal, setShowDietFormModal] = useState(false);
    const [editingDiet, setEditingDiet] = useState<Diet | null>(null);

    // Centre Management States
    const [centres, setCentres] = useState<Centre[]>([]);
    const [loadingCentres, setLoadingCentres] = useState(true);
    const [submittingCentre, setSubmittingCentre] = useState(false);
    const [centreError, setCentreError] = useState<string | null>(null);
    const [showCentreFormModal, setShowCentreFormModal] = useState(false);
    const [editingCentre, setEditingCentre] = useState<Centre | null>(null);

    const fetchCentres = useCallback(async () => {
        try {
            setLoadingCentres(true);
            setCentreError(null);
            const centresCollectionRef = collection(db, 'centres');
            const centresSnapshot = await getDocs(centresCollectionRef);
            const centresList = centresSnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                name: docSnap.data().name || '',
                code: docSnap.data().code || ''
            }));
            const sortedCentres = centresList.sort((a, b) => a.name.localeCompare(b.name));
            setCentres(sortedCentres);
        } catch (err: any) {
            setCentreError(`Error fetching centres: ${err.message}`);
            toast({ title: "Error", description: `Error fetching centres: ${err.message}`, variant: "destructive" });
            console.error(err);
        } finally {
            setLoadingCentres(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchCentres();
    }, [fetchCentres]);

    useEffect(() => {
        const fetchUsersForSelectedCentre = async () => {
          if (!selectedCentreIdForUsers) {
            setUsers([]); 
            setIsUsersLoadingForSelectedCentre(false); 
            return;
          }
    
          try {
            setIsUsersLoadingForSelectedCentre(true);
            setUserError(null);
            const centreRef = doc(db, 'centres', selectedCentreIdForUsers);
            const centreDoc = await getDoc(centreRef);
      
            if (centreDoc.exists()) {
              const data = centreDoc.data();
              if (data && data.users && Array.isArray(data.users)) {
                const rawUsers = data.users as any[];
                const validUsers = rawUsers
                  .filter(u => u && typeof u.id === 'string' && typeof u.name === 'string') 
                  .map(u => ({ 
                    id: u.id,
                    name: u.name,
                    role: u.role || 'carer', 
                    diet: u.diet || null,
                    birthday: u.birthday || null,
                  })) as CentreUser[];
                setUsers(validUsers.sort((a,b) => a.name.localeCompare(b.name)));
              } else {
                setUsers([]);
              }
            } else {
              setUsers([]);
              setUserError(`Centre document for ${selectedCentreIdForUsers} not found.`);
            }
          } catch (err: any) {
            setUserError(`Error fetching users for ${selectedCentreIdForUsers}: ${err.message}`);
            console.error(err);
            setUsers([]);
          } finally {
            setIsUsersLoadingForSelectedCentre(false);
          }
        };
    
        fetchUsersForSelectedCentre();
    }, [selectedCentreIdForUsers]);

    useEffect(() => {
        const fetchDietsData = async () => {
            try {
                setLoadingDiets(true);
                setDietError(null);
                const dietsCollectionRef = collection(db, 'diets');
                const dietsSnapshot = await getDocs(dietsCollectionRef);
                const dietsList = dietsSnapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    description: docSnap.data().description || '',
                    name: docSnap.data().name || docSnap.id,
                }));
                setDiets(dietsList.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)));
            } catch (err: any) {
                setDietError(`Error fetching diets: ${err.message}`);
                toast({ title: "Error", description: `Error fetching diets: ${err.message}`, variant: "destructive" });
                console.error(err);
            } finally {
                setLoadingDiets(false);
            }
        };
        fetchDietsData();
    }, [toast]);

    const addUser = async (newUser: CentreUser) => {
        if (!selectedCentreIdForUsers) {
            setUserError("No centre selected to add the user to.");
            toast({ title: "Error", description: "Please select a centre first.", variant: "destructive" });
            return;
        }
        if (users.some(user => user.id === newUser.id)) {
            setUserError(`User with ID ${newUser.id} already exists in this centre.`);
            toast({ title: "Error", description: `User with ID ${newUser.id} already exists.`, variant: "destructive" });
            return;
        }
        try {
          setSubmittingUser(true);
          setUserError(null);
          const centreRef = doc(db, 'centres', selectedCentreIdForUsers);
          await updateDoc(centreRef, {
            users: arrayUnion(newUser)
          });
          setUsers(prevUsers => [...prevUsers, newUser].sort((a,b) => a.name.localeCompare(b.name)));
          setShowAddUserModal(false);
          setEditingUser(null);
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
        if (!selectedCentreIdForUsers) {
            setUserError("No centre selected to update the user in.");
            toast({ title: "Error", description: "Please select a centre first.", variant: "destructive" });
            return;
        }
        try {
          const centreRef = doc(db, 'centres', selectedCentreIdForUsers);
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
          setShowAddUserModal(false);
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
        if (!selectedCentreIdForUsers) {
            setUserError("No centre selected to delete the user from.");
            toast({ title: "Error", description: "Please select a centre first.", variant: "destructive" });
            return;
        }
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
          const centreRef = doc(db, 'centres', selectedCentreIdForUsers);
          setSubmittingUser(true);
          setUserError(null); 
          const userToRemove = users.find(user => user.id === userId);
          if (userToRemove) {
            await updateDoc(centreRef, {
              users: arrayRemove(userToRemove)
            });
            setUsers(users.filter(user => user.id !== userId)); 
            toast({ title: "Success", description: "User deleted successfully." });
          } else {
             setUserError(`User with ID ${userId} not found in the current list for centre ${selectedCentreNameForUsers}.`);
             toast({ title: "Warning", description: "User not found in current list.", variant: "default" });
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
            await setDoc(dietDocRef, { description: dietData.description, name: dietData.name || dietData.id }); 

            if (editingDiet) { 
                setDiets(diets.map(d => d.id === dietData.id ? dietData : d).sort((a,b) => (a.name || a.id).localeCompare(b.name || b.id)));
                toast({ title: "Success", description: `Diet ${dietData.name || dietData.id} updated successfully.` });
            } else { 
                if (diets.some(d => d.id === dietData.id)) {
                    setDiets(diets.map(d => d.id === dietData.id ? dietData : d).sort((a,b) => (a.name || a.id).localeCompare(b.name || b.id)));
                    toast({ title: "Success", description: `Diet ${dietData.name || dietData.id} (existing) updated successfully.` });
                } else {
                    setDiets(prevDiets => [...prevDiets, dietData].sort((a,b) => (a.name || a.id).localeCompare(b.name || b.id)));
                    toast({ title: "Success", description: `Diet ${dietData.name || dietData.id} added successfully.` });
                }
            }
            setShowDietFormModal(false);
            setEditingDiet(null);
        } catch (err: any) {
            setDietError(`Error saving diet: ${err.message}`);
            toast({ title: "Error", description: `Error saving diet ${dietData.name || dietData.id}: ${err.message}`, variant: "destructive" });
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

    const handleAddOrUpdateCentre = async (centreData: Centre) => {
        try {
            setSubmittingCentre(true);
            setCentreError(null);
            const centreDocRef = doc(db, 'centres', centreData.id);
            const currentDoc = await getDoc(centreDocRef);
            const dataToSet: any = { name: centreData.name, code: centreData.code };
            if (!currentDoc.exists()) {
                dataToSet.users = []; 
            }
            await setDoc(centreDocRef, dataToSet, { merge: true });

            if (editingCentre) {
                setCentres(prevCentres => prevCentres.map(c => c.id === centreData.id ? centreData : c).sort((a,b) => a.name.localeCompare(b.name)));
                toast({ title: "Success", description: `Centre ${centreData.name} updated successfully.` });
            } else {
                await fetchCentres(); 
                toast({ title: "Success", description: `Centre ${centreData.name} added successfully.` });
            }
            setShowCentreFormModal(false);
            setEditingCentre(null);
        } catch (err: any) {
            setCentreError(`Error saving centre: ${err.message}`);
            toast({ title: "Error", description: `Error saving centre ${centreData.name}: ${err.message}`, variant: "destructive" });
            console.error(err);
        } finally {
            setSubmittingCentre(false);
        }
    };

    const handleDeleteCentre = async (centreIdToDelete: string) => {
        if (!confirm(`Are you sure you want to delete centre ${centreIdToDelete}? This action CANNOT be undone and will delete all associated users.`)) return;
        try {
            setSubmittingCentre(true);
            setCentreError(null);
            const centreDocRef = doc(db, 'centres', centreIdToDelete);
            await deleteDoc(centreDocRef);
            setCentres(centres.filter(c => c.id !== centreIdToDelete));
            if (selectedCentreIdForUsers === centreIdToDelete) {
                setSelectedCentreIdForUsers(null);
                setSelectedCentreNameForUsers(null);
                setUsers([]);
            }
            toast({ title: "Success", description: `Centre ${centreIdToDelete} deleted successfully.` });
        } catch (err: any) {
            setCentreError(`Error deleting centre: ${err.message}`);
            toast({ title: "Error", description: `Error deleting centre ${centreIdToDelete}: ${err.message}`, variant: "destructive" });
            console.error(err);
        } finally {
            setSubmittingCentre(false);
        }
    };

interface UserFormProps {
    onSubmitUser: (user: CentreUser) => void;
    onClose: () => void;
    submitting: boolean;
    initialUser?: CentreUser | null;
    selectedCentreId: string | null; 
}

const UserForm: React.FC<UserFormProps> = ({ onSubmitUser, onClose, submitting, initialUser, selectedCentreId }) => {
    const [formData, setFormData] = useState<CentreUser>({
      id: initialUser?.id || '',
      name: initialUser?.name || '',
      birthday: initialUser?.birthday || null,
      diet: initialUser?.diet || null,
      role: initialUser?.role || 'carer',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCentreId) {
          toast({ title: "Error", description: "Cannot submit user form without a selected centre.", variant: "destructive"});
          return;
      }
      if (!initialUser && !formData.id.trim()) { // ID is required only for new users
          toast({ title: "Validation Error", description: "User ID cannot be empty for new users.", variant: "destructive"});
          return;
      }
      if (!formData.name.trim()) {
        toast({ title: "Validation Error", description: "User Name cannot be empty.", variant: "destructive"});
        return;
    }
      onSubmitUser(formData);
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
            } catch (e) { /* ignore invalid date string */ }
        }
    }
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>{initialUser ? `Edit User: ${initialUser.name}` : 'Add New User'}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!initialUser && (
                        <div>
                            <Label htmlFor="id">User ID</Label>
                            <Input 
                                id="id" 
                                name="id" 
                                value={formData.id} 
                                onChange={handleChange} 
                                required 
                                placeholder="Unique identifier for the user"
                            />
                        </div>
                    )}
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
                        <Button type="submit" disabled={submitting || !selectedCentreId}>
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {submitting ? (initialUser ? 'Updating...' : 'Adding...') : (initialUser ? 'Update User' : 'Add User')}
                        </Button>
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
    const [name, setName] = useState(initialDiet?.name || initialDiet?.id || '');
    const [description, setDescription] = useState(initialDiet?.description || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!id.trim() || !description.trim()) { 
            toast({ title: "Validation Error", description: "Diet ID and Description cannot be empty.", variant: "destructive"});
            return;
        }
        onSubmitDiet({ id: id.trim().toUpperCase(), name: name.trim() || id.trim().toUpperCase(), description: description.trim() });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{initialDiet ? `Edit Diet: ${initialDiet.name || initialDiet.id}` : 'Add New Diet'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="dietIdForm">Diet ID (e.g., D1, VEG)</Label>
                            <Input 
                                id="dietIdForm" 
                                name="dietIdForm" 
                                value={id} 
                                onChange={(e) => setId(e.target.value)} 
                                required 
                                disabled={!!initialDiet} 
                                className={initialDiet ? "bg-muted cursor-not-allowed" : ""}
                                placeholder="Unique identifier (e.g., VEGAN)"
                            />
                            {initialDiet && <p className="text-xs text-muted-foreground mt-1">Diet ID cannot be changed after creation.</p>}
                        </div>
                        <div>
                            <Label htmlFor="dietNameForm">Diet Name (Optional, for display)</Label>
                            <Input 
                                id="dietNameForm" 
                                name="dietNameForm" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                placeholder="User-friendly name (e.g., Vegan Diet)"
                            />
                        </div>
                        <div>
                            <Label htmlFor="descriptionForm">Description</Label>
                            <Input 
                                id="descriptionForm" 
                                name="descriptionForm" 
                                value={description} 
                                onChange={(e) => setDescription(e.target.value)} 
                                required 
                                placeholder="Detailed description of the diet"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {submitting ? (initialDiet ? 'Updating...' : 'Adding...') : (initialDiet ? 'Update Diet' : 'Add Diet')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

interface CentreFormProps {
    onSubmitCentre: (centre: Centre) => void;
    onClose: () => void;
    submitting: boolean;
    initialCentre?: Centre | null;
}

const CentreForm: React.FC<CentreFormProps> = ({ onSubmitCentre, onClose, submitting, initialCentre }) => {
    const [id, setId] = useState(initialCentre?.id || '');
    const [name, setName] = useState(initialCentre?.name || '');
    const [code, setCode] = useState(initialCentre?.code || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!id.trim() || !name.trim() || !code.trim()) {
            toast({ title: "Validation Error", description: "Centre ID, Name, and Code cannot be empty.", variant: "destructive" });
            return;
        }
        onSubmitCentre({ id: id.trim().toLowerCase(), name: name.trim(), code: code.trim() });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{initialCentre ? `Edit Centre: ${initialCentre.name}` : 'Add New Centre'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="centreIdForm">Centre ID (e.g., vi, southcreek - all lowercase, no spaces)</Label>
                            <Input
                                id="centreIdForm"
                                name="centreIdForm"
                                value={id}
                                onChange={(e) => setId(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                                required
                                disabled={!!initialCentre}
                                className={initialCentre ? "bg-muted cursor-not-allowed" : ""}
                                placeholder="Unique ID (e.g., mainsite)"
                            />
                            {initialCentre && <p className="text-xs text-muted-foreground mt-1">Centre ID cannot be changed after creation.</p>}
                        </div>
                        <div>
                            <Label htmlFor="centreNameForm">Centre Name</Label>
                            <Input
                                id="centreNameForm"
                                name="centreNameForm"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="Full display name (e.g., Main Site Campus)"
                            />
                        </div>
                        <div>
                            <Label htmlFor="centreCodeForm">Centre Code (for sign-in)</Label>
                            <Input
                                id="centreCodeForm"
                                name="centreCodeForm"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                placeholder="Secure code for user sign-in"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {submitting ? (initialCentre ? 'Updating...' : 'Adding...') : (initialCentre ? 'Update Centre' : 'Add Centre')}
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
            <Header centre={selectedCentreNameForUsers || "Settings"} title="Management" />
            <CardContent className="grid gap-4 px-4 pt-4">
                <Tabs defaultValue="centres" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="centres">Manage Centres</TabsTrigger>
                        <TabsTrigger value="users">Manage Users</TabsTrigger>
                        <TabsTrigger value="diets">Manage Diets</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    </TabsList>

                    <TabsContent value="centres">
                        <Card className="mt-4">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Available Centres</CardTitle>
                                <Button onClick={() => { setEditingCentre(null); setShowCentreFormModal(true); }} disabled={submittingCentre}>Add New Centre</Button>
                            </CardHeader>
                            <CardContent>
                                {loadingCentres && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                                {centreError && <p className="text-red-500 py-2">{centreError}</p>}
                                {!loadingCentres && !centreError && centres.length === 0 && <p>No centres found. Add one to get started!</p>}
                                {!loadingCentres && !centreError && centres.length > 0 && (
                                  <ul className="space-y-2">
                                    {centres.map(centre => (
                                      <li key={centre.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-secondary/50">
                                        <div>
                                            <p className="font-semibold">{centre.name} <span className="text-sm text-muted-foreground">(ID: {centre.id})</span></p>
                                            <p className="text-xs text-muted-foreground">Code: {centre.code}</p>
                                        </div>
                                        <div className="space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => { setEditingCentre(centre); setShowCentreFormModal(true); }} disabled={submittingCentre}>Edit</Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteCentre(centre.id)} disabled={submittingCentre}>Delete</Button>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users">
                        <div className="my-4">
                            <Label htmlFor="centre-select-for-users">Select Centre to Manage Users:</Label>
                            <Select
                                value={selectedCentreIdForUsers || ""}
                                onValueChange={(value) => {
                                    setSelectedCentreIdForUsers(value);
                                    const selected = centres.find(c => c.id === value);
                                    setSelectedCentreNameForUsers(selected ? selected.name : null);
                                }}
                                disabled={loadingCentres || centres.length === 0}
                            >
                                <SelectTrigger id="centre-select-for-users" className="w-full md:w-1/2 mt-1">
                                    <SelectValue placeholder="Select a centre..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingCentres ? (
                                        <SelectItem value="loading" disabled>Loading centres...</SelectItem>
                                    ) : centres.length === 0 ? (
                                        <SelectItem value="no-centres" disabled>No centres available. Add a centre first.</SelectItem>
                                    ) : (
                                        centres.map(centre => (
                                            <SelectItem key={centre.id} value={centre.id}>{centre.name}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Users for {selectedCentreNameForUsers || "N/A"}</CardTitle>
                                <Button 
                                    onClick={() => { setEditingUser(null); setShowAddUserModal(true); }} 
                                    disabled={submittingUser || !selectedCentreIdForUsers || isUsersLoadingForSelectedCentre}
                                >
                                    Add New User
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {isUsersLoadingForSelectedCentre && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                                {userError && <p className="text-red-500 py-2">{userError}</p>}
                                {!selectedCentreIdForUsers && !isUsersLoadingForSelectedCentre && <p>Please select a centre to view users.</p>}
                                {selectedCentreIdForUsers && !isUsersLoadingForSelectedCentre && !userError && users.length === 0 && <p>No users found for {selectedCentreNameForUsers || 'the selected centre'}.</p>}
                                {selectedCentreIdForUsers && !isUsersLoadingForSelectedCentre && !userError && users.length > 0 && (
                                  <ul className="space-y-2">
                                    {users.map(user => (
                                      <li key={user.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-secondary/50">
                                        <div>
                                            <p className="font-semibold">{user.name} <span className="text-sm text-muted-foreground">(ID: {user.id}, Role: {user.role})</span></p>
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
                                {!loadingDiets && !dietError && diets.length === 0 && <p>No diets found. Add one to get started!</p>}
                                {!loadingDiets && !dietError && diets.length > 0 && (
                                  <ul className="space-y-2">
                                    {diets.map(diet => (
                                      <li key={diet.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-secondary/50">
                                        <div>
                                            <p className="font-semibold">{diet.name || diet.id}</p>
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

                {showAddUserModal && selectedCentreIdForUsers && (
                    <UserForm
                      initialUser={editingUser}
                      onSubmitUser={editingUser ? updateUser : addUser}
                      onClose={() => { setShowAddUserModal(false); setEditingUser(null); }}
                      submitting={submittingUser}
                      selectedCentreId={selectedCentreIdForUsers}
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

                {showCentreFormModal && (
                    <CentreForm
                        initialCentre={editingCentre}
                        onSubmitCentre={handleAddOrUpdateCentre}
                        onClose={() => { setShowCentreFormModal(false); setEditingCentre(null); }}
                        submitting={submittingCentre}
                    />
                )}
            </CardContent>
        </Card>
      </div>
    );
}

    

    