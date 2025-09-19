import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import {io,userSocketMap} from "../server.js";

//Get all users except logged in user
export const getUsersForSidebar = async (req,res) => {
    try{
        const userId = req.user._id;
        const filteredUsers = await User.find({_id:{$ne: userId}}).select("-password");

        //count number of message
        const unseenMessages = {}
        const promises = filteredUsers.map(async(user)=>{
            const messages = await Message.find({senderId: user._id, 
                                            recieverId: userId, seen: false})
            if(messages.length>0){
                unseenMessages[user._id] = messages.length;
            }
        })

        await Promise.all(promises);
        return res.json({
            success:true,
            filteredUsers,
            unseenMessages
        })
    }
    catch(error){
        console.log(error.message)
        return res.json({
            success:false,
            message:error.message
        })
    }
}

//get all messages for selected user
export const getMessages = async (req,res) => {
    try {
        const {id: selectedUserId} = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                {senderId:myId, recieverId:selectedUserId},
                {senderId:selectedUserId, recieverId:myId}
            ]
        })

        await Message.updateMany({senderId: selectedUserId, recieverId: myId},
            {seen:true}
        );

        return res.json({
            success:true,
            messages
        })
    }
    catch (error) {
        console.log(error.message)
        return res.json({
            success:false,
            message:error.message
        })
    }
}

//api to mark message as seen using message id
export const markMessaegeAsSeen = async (req,res) => {
    try {
        const {id} = req.params;
        await Message.findByIdAndUpdate(id,{seen:true})
        return res.json({
            success:true
        })
    }
    catch (error) {
        console.log(error.message)
        return res.json({
            success:false,
            message:error.message
        })
    }
}

//send message to selected user
// export const sendMessage = async (req,res) => {
//     try {
//         const {text,image} = req.body;
//         const recieverId = req.params.id;
//         const senderId = req.user._id;

//         let imageUrl;
//         if(image){
//             const uploadResponse = await cloudinary.uploader.upload(image)
//             imageUrl = uploadResponse.secure_url;
//         }

//         const newMessage = Message.create({
//             senderId,
//             recieverId,
//             text,
//             image:imageUrl
//         })
        
//         const recieverSocketId = userSocketMap[recieverId];
//         if(recieverSocketId){
//             io.to(recieverSocketId).emit("newMessage", newMessage)
//         }

//         return res.json({
//             success:true,
//             newMessage
//         });
//     }
//     catch (error) {
//         console.log(error.message)
//         return res.json({
//             success:false,
//             message:error.message
//         })
//     }
// }

export const sendMessage = async (req,res) => {
  try {
    const { text, image } = req.body;
    const recieverId = req.params.id; // consider renaming to receiverId project-wide
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // wait for DB save — important!
    const savedMessage = await Message.create({
      senderId,
      recieverId,
      text,
      image: imageUrl
    });

    // Ensure the object you emit is plain JSON (and createdAt is ISO)
    const emittedMessage = {
      id: savedMessage._id.toString(),
      senderId: savedMessage.senderId,
      recieverId: savedMessage.recieverId,
      text: savedMessage.text,
      image: savedMessage.image || null,
      seen: !!savedMessage.seen,
      createdAt: savedMessage.createdAt ? savedMessage.createdAt.toISOString() : new Date().toISOString()
    };

    // Emit to receiver if connected
    const recieverSocketId = userSocketMap[recieverId];
    if (recieverSocketId) {
      io.to(recieverSocketId).emit("newMessage", emittedMessage);
    }

    // Also emit to sender so sender receives authoritative message (avoid client/server mismatch)
    const senderSocketId = userSocketMap[senderId];
    if (senderSocketId && senderSocketId !== recieverSocketId) {
      io.to(senderSocketId).emit("newMessage", emittedMessage);
    }

    return res.json({
      success: true,
      newMessage: emittedMessage
    });
  } catch (error) {
    console.log(error.message);
    return res.json({
      success: false,
      message: error.message
    });
  }
}
