"use client"

import React, { useRef, useState, useEffect } from 'react';
import { getFirestore, Timestamp, collection, doc, query, orderBy, limit, addDoc, serverTimestamp, CollectionReference, onSnapshot, where, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { formatDate } from '@/lib/utils';

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
  const messagesRef: CollectionReference<Message> = collection(db, 'chats') as CollectionReference<Message>;
  //const messagesQuery = query(messagesRef, where('uid', '==', currentUser), orderBy('createdAt'), limit(50));
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Access localStorage inside useEffect
    setCurrentUser(localStorage.getItem('username'));
    setFullname(localStorage.getItem('fullname'));
  }, []); // Run this effect only once on component mount

  useEffect(() => {
    // Only set up the snapshot listener if currentUser is available
    if (currentUser) {
      const messagesQuery = query(messagesRef, where('uid', '==', currentUser), orderBy('createdAt'), limit(50));

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesData: Message[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<Message, 'id'>
        }));
        setMessages(messagesData);
        console.log(messagesData)
      });
      
      return () => unsubscribe();
    } else {
      // Clear messages if currentUser becomes null (e.g., on sign out)
      setMessages([]);
    }
  }, [currentUser]);

  const [formValue, setFormValue] = useState('');

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
        console.log(reply)
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
      setMessages(prevMessages => [
        ...prevMessages,
        { uid: currentUser, name: fullname || '', text: formValue, createdAt: { toDate: () => new Date() } } as Message // Add a temporary createdAt
      ]);
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
          <main className="p-2 h-[80vh] my-[10vh] overflow-y-scroll flex flex-col">
              {/*{messages && messages.map(msg => <ChatMessage key={msg.id ? msg.id : Date.now()+'-'+Math.random()} message={msg} />)}
              <span ref={dummy}></span>*/}
              {messages.map(msg => (
                <ChatMessage
                  key={msg.id ? msg.id : Date.now() + '-' + Math.random()}
                  message={msg}
                  onMessageClick={() => handleMessageClick(msg.id || null)} // Use the handleMessageClick function
                  isHighlighted={msg.id === highlightedMessageId}
                  highlightedMessageId={highlightedMessageId}
                />
              ))}
          </main>
          <form className="h-[10vh] fixed bottom-0 bg-[rgb(24,23,23)] w-full max-w-[890px] flex text-xl" onSubmit={sendMessage}>
              <input className="leading-normal w-full text-xl bg-[rgb(58,58,58)] text-white outline-none border-none px-2" value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="say something nice" />
              <button className="w-1/5 bg-[rgb(56,56,143)] disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={!formValue}>🕊️</button>
          </form>
      </>
  )
}
  
  
interface ChatMessageProps {
    message: Message;
    onMessageClick: (messageId: string | null) => void;
    isHighlighted: boolean;
    highlightedMessageId: string | null;
}
  
function ChatMessage(props: ChatMessageProps) {
    const { text, uid, name, createdAt, id } = props.message;
    const { onMessageClick, isHighlighted, message } = props;
    let textDate = ''
    if (createdAt) {
      const d = createdAt.toDate();
      textDate = formatDate(new Date(d))
    }

    const msgFormat = (msg: Message) => {
      return (
        <>
          <p className="leading-none text-[7px] text-[#ccc]">{textDate}</p>
          <p className="leading-none text-[10px]">
            {msg.name ? msg.name : 'Anonymous'} says:
          </p>
          <p className="text-base mt-2">
            {msg.text}
          </p>
        </>
      )
    }

    //const messageDivClass = `flex flex-col items-center opacity-100 ${isHighlighted ? 'opacity-100' : 'opacity-25'}`;
    //const opacityClass = (highlightedMessageId === null || isHighlighted) ? 'opacity-100' : 'opacity-25';
    const opacityClass = isHighlighted ? 'opacity-100' : (props.highlightedMessageId === null ? 'opacity-100' : 'opacity-25'); // Fixed opacity logic
  
    return (
      <>
        <div className={`flex flex-col items-center ${opacityClass} transition-opacity-transform duration-300`} onClick={(e) => { e.stopPropagation(); onMessageClick(message.id || null); }}> {/* Add onClick to the message div */}
          <div className={`flex flex-col items-center ${isHighlighted ? 'scale-105' : 'scale-100'} transition-opacity-transform duration-300 ease-bubble`}>
            <div className={`max-w-sm mt-6 leading-6 p-3 rounded-xl relative text-white text-left bg-[#4864c3] `}>
              {msgFormat(props.message)}
            </div>
            {/* Display replies if they exist */}
            {message?.replies && message?.replies.map((reply, index) => (
              // You'll need to style these replies appropriately
              <div key={index} className={`max-w-sm leading-6 p-3 rounded-xl relative text-white text-left bg-[#0b93f6] self-end'}`}>
                {msgFormat(reply)}
              </div>
            ))}
          </div>
        </div>
      </>
    )
}