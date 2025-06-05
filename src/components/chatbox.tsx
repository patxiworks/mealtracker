"use client"

import React, { useRef, useState, useEffect } from 'react';
import { getFirestore, Timestamp, collection, doc, query, orderBy, limit, addDoc, serverTimestamp, CollectionReference, onSnapshot, where, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { formatDate } from '@/lib/utils';
import { LoaderPinwheel, Send, CircleX } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id?: string;
  uid: string;
  text: string;
  name?: string;
  createdAt: any; // Consider a more specific type if possible
  replies?: { // Make replies optional
    uid: string;
    name: string;
    text: string;
    createdAt: any;
  }[]; // Array of reply objects
}

export function ChatRoom() {
  const dummy = useRef<HTMLDivElement>(null);
  //const firestore = getFirestore();
  const [currentUser, setCurrentUser] = useState<string | null>(null); // Use state for currentUser
  const [fullname, setFullname] = useState<string | null>(null); // Use state for fullname
  const [userRole, setUserRole] = useState<string | null>(null); // Use state for fullname
  const messagesRef: CollectionReference<Message> = collection(db, 'chats') as CollectionReference<Message>;
  //const messagesQuery = query(messagesRef, where('uid', '==', currentUser), orderBy('createdAt'), limit(50));
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [formValue, setFormValue] = useState('');
  const [loading, setLoading] = useState(false);
  //const isMobile = useIsMobile();

  useEffect(() => {
    // Access localStorage inside useEffect
    setCurrentUser(localStorage.getItem('username'));
    setFullname(localStorage.getItem('fullname'));
    setUserRole(localStorage.getItem('role'));
  }, []); // Run this effect only once on component mount

  useEffect(() => {
    // Only set up the snapshot listener if currentUser is available
    if (currentUser) {
      try {
        setLoading(true)
        let messagesQuery = query(messagesRef, where('uid', '==', currentUser), orderBy('createdAt'), limit(50));
        if (userRole == "admin") {
          messagesQuery = query(messagesRef, orderBy('createdAt'), limit(50));
        }
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
          const messagesData: Message[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data() as Omit<Message, 'id'>
          }));
          setMessages(messagesData.sort((a, b) => b.createdAt - a.createdAt));
        });
        
        return () => unsubscribe();
      } catch (e: any) {
        console.error('Error fetching messages:', e);
      } finally {
        setLoading(false)
      }
    } else {
      // Clear messages if currentUser becomes null (e.g., on sign out)
      setMessages([]);
    }
  }, [currentUser]);

  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Construct a reference to the message document
      const messageRef = doc(db, 'chats', messageId); // Replace 'messages' with your actual collection name
      // Delete the document
      await deleteDoc(messageRef);
      console.log(`Message with ID ${messageId} deleted successfully.`);
      // Update the local state to remove the deleted message
      setMessages(messages.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error(`Error deleting message with ID ${messageId}:`, error);
    }
    setHighlightedMessageId(null);
  };

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!currentUser) return; // Don't send if currentUser is null
      if (highlightedMessageId) {
        // If a message is highlighted, add a reply
        const messageDocRef = doc(db, 'chats', highlightedMessageId); // Get the reference to the message document
        const reply = {
          uid: currentUser,
          name: fullname || '',
          text: formValue,
          createdAt: Timestamp.fromDate(new Date()), // Use serverTimestamp() here
        };
        await updateDoc(messageDocRef, {
          replies: arrayUnion(reply)
        });
        setHighlightedMessageId(null); // Unhighlight after sending reply
      } else {
        // Otherwise, add a new message
        await addDoc(messagesRef, {
            uid: currentUser,
            name: fullname || '',
            text: formValue,
            createdAt: serverTimestamp(),
        });
      }
      // Append the new message to the messages state
      // setMessages(prevMessages => [
      //   ...prevMessages,
      //   { uid: currentUser, name: fullname || '', text: formValue, createdAt: { toDate: () => new Date() } } as Message // Add a temporary createdAt
      // ]);
      setFormValue(''); // Clear the form after sending
    dummy.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const handleMessageClick = (messageId: string | null) => {
    if (highlightedMessageId === messageId) {
      setHighlightedMessageId(null); // Unhighlight if the same message is clicked
    } else {
      setHighlightedMessageId(messageId); // Highlight the clicked message
    }
  };

  return (
    <>
      <main className="p-2 h-[84vh] mt-[6vh] overflow-y-scroll flex flex-col items-center">
        {/*{messages && messages.map(msg => <ChatMessage key={msg.id ? msg.id : Date.now()+'-'+Math.random()} message={msg} />)}*/}
        {loading ? (
            <LoaderPinwheel className="h-8 w-8 animate-spin text-[#4864c3]" />
          ) : (
          messages.map(msg => (
            <ChatMessage
              key={msg.id ? msg.id : Date.now() + '-' + Math.random()}
              message={msg}
              onMessageClick={() => handleMessageClick(msg.id || null)} // Use the handleMessageClick function
              isHighlighted={msg.id === highlightedMessageId}
              highlightedMessageId={highlightedMessageId}
              onDeleteMessage={handleDeleteMessage}
            />
          ))
        )}
      </main>
      <form className="fixed bottom-0 bg-[rgb(24,23,23)] w-full max-w-[890px] flex text-xl" onSubmit={sendMessage}>
          <textarea className="leading-normal w-full text-base bg-[rgb(58,58,58)] text-white outline-none border-none px-4 py-2" value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="Send a message" />
          <button className="flex justify-center items-center w-1/5 bg-[#4864c3] disabled:opacity-70 disabled:cursor-not-allowed" type="submit" disabled={!formValue}><Send size={30} /></button>
      </form>
    </>
  )
}
  
  
interface ChatMessageProps {
    message: Message;
    onMessageClick: (messageId: string | null) => void;
    isHighlighted: boolean;
    highlightedMessageId: string | null;
    onDeleteMessage: (messageId: string) => void; // Add delete handler prop
}
  
function ChatMessage(props: ChatMessageProps) {
  const { text, uid, name, createdAt, id } = props.message; // Include id
  const { onMessageClick, isHighlighted, message, onDeleteMessage } = props; // Include onDeleteMessage
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  //const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const pressTimer = useRef<any | null>(null); // Changed type to any for broader compatibility
  const handleMouseDown = () => {
    pressTimer.current = setTimeout(() => {
      setShowDeleteConfirm(true); // Show confirmation after a long press
    }, 700); // Adjust the time for long press
  };

  const handleMouseUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent default touch behavior to avoid issues with long press
    //e.preventDefault();
    pressTimer.current = setTimeout(() => {
      setShowDeleteConfirm(true); // Show confirmation after a long press
    }, 700); // Adjust the time for long press
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) { // Only clear timer if it exists
      clearTimeout(pressTimer.current);
    }
  };

  let textDate = ''
  //if (createdAt) {
  if (createdAt && typeof createdAt.toDate === 'function') {
    const d = createdAt.toDate();
    textDate = formatDate(new Date(d))
  }

  const msgFormat = (msg: Message) => {
    return (
      <>
        <p className="leading-none mb-1 text-[7px] text-[#5876517a]">{textDate}</p>
        <p className="leading-none text-[10px] text-[#5b5959]">
          {msg.name ? msg.name : 'Anonymous'} says:
        </p>
        <p className="text-base mt-2">
          {msg.text}
        </p>
      </>
    )
  }

  const opacityClass = isHighlighted ? 'opacity-100' : (props.highlightedMessageId === null ? 'opacity-100' : 'opacity-25'); // Fixed opacity logic

  return (
    <>
      {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <p>Are you sure you want to delete this message?</p>
              <div className="mt-4 flex justify-end gap-4">
                <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700" onClick={() => {
                  if (message.id) onDeleteMessage(message.id);
                  setShowDeleteConfirm(false);
                }}>Yes</button>
                <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400" onClick={() => setShowDeleteConfirm(false)}>No</button>
              </div>
            </div>
          </div>
        )}
        {/*<div className={`flex flex-col items-center max-w-[80%] ${opacityClass} transition-opacity-transform duration-300`} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={(e) => { e.stopPropagation(); onMessageClick(message.id || null); }}>*/}
        <div className={`flex flex-col items-center max-w-[80%] ${opacityClass} transition-opacity-transform duration-300`} onClick={(e) => { e.stopPropagation(); onMessageClick(message.id || null); }}>
          <div className={`flex flex-col items-center ${isHighlighted ? 'scale-105' : 'scale-100'} transition-transform duration-300 ease-bubble`}> {/* Changed transition property */}
            <div className={`max-w-sm mt-6 leading-6 p-3 rounded-xl relative text-[#2c2c2c] text-left bg-[#A2D9AB] border border-[#7CB98E]`}>
              {msgFormat(message)}
              {isHighlighted && (
                <button
                  className="absolute -top-3 -right-3 mt-1 mr-1 p-1 rounded-full bg-red-500 text-white text-xs" // Added styling for delete icon
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent message click from happening
                    setShowDeleteConfirm(true);
                  }}
                >
                  <CircleX />
                </button>
              )}
            </div>
            {/* Display replies if they exist */}
            {message?.replies && message.replies.map((reply, index) => (
              <div key={index} className={`max-w-sm leading-6 -mt-1 p-3 rounded-xl relative text-[#2c2c2c] text-left bg-[#F0E68C] border border-[#D4C77E]`}>
                {msgFormat(reply)} {/* Use msgFormat for replies as well */}
              </div>
          ))}
        </div>
      </div>
    </>
  )
}