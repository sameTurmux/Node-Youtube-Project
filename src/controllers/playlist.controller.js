import mongoose from "mongoose";
import playlistModel from "../models/playlist.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHanlder.js";
import { isValidObjectId } from "../utils/mongooseObjectId.js";


const createPlaylist = asyncHandler( async (req,res) => {

    const {playlistName,playlistDescription,videoId} = req.body;

    
    if ([playlistName, videoId].some(field => (field?.trim?.() ?? "") === "")) {
        throw new ApiError(404, "Playlist name or video ID is missing or empty");
    }

    const playlist = await playlistModel.create({
        videos:videoId,
        name:playlistName,
        description:playlistDescription || "",
        owner:req.user.id
    });

    if(!playlist){
        throw new ApiError(500,"some thing wrong server is busy error from createAPlaylist ");
    }

    return res.json(
        new ApiResponse(playlist,true,"playlist successfully created",200)
    )

} );


const removePlaylist = asyncHandler( async (req,res) => {
    const playlistId = req.params.playlistId;
    if(!playlistId){
        throw new ApiError(404,"playlistId not found");
    }
    const validObjId = await isValidObjectId(playlistId);
    if(validObjId == false){
        throw new ApiError(403,"invalid object id for a playlist ")
    }
    
    const removePlaylist = await playlistModel.findByIdAndDelete(playlistId);
    
    if(!removePlaylist){
        throw new ApiError(500,"playlist removed proccess not successfull")
    }

    return res.json(
        new ApiResponse("",true,"playlist removed Successfully",200)
    )

})

const updatePlaylist = asyncHandler( async (req,res) => {

    const { name, privacy, description, playlistId } = req.body;

    if ([name, privacy,description, playlistId].some(field => (field?.trim?.() ?? "") === "")) {
        throw new ApiError(404, "Playlist name or video ID is missing or empty");
    }
    const validObjId = await isValidObjectId(playlistId);

    if(validObjId == false){
        throw new ApiError(403,"Error: Invalid playlistId Is Required");
    }

    const safeDescription = description?.trim() || null;

    const checkPlaylist = await playlistModel.findOne({_id:new mongoose.Types.ObjectId(playlistId),owner:new mongoose.Types.ObjectId(req.user.id)});

    if(!checkPlaylist){
        throw new ApiError(404,"playlist is not found");
    }

    const updatedPlaylist = await playlistModel.findByIdAndUpdate(checkPlaylist._id,{
        $set : {
            name:name,
            description:safeDescription,
            visibility:privacy,
            owner:new mongoose.Types.ObjectId(req.user.id)
        }
    },{new:true});

    if(!updatedPlaylist){
        throw new ApiError(500,"some thing wrong server is busy error from updateThePlayList");
    }

    return res.json(
        new ApiResponse(updatedPlaylist,true,"playlist updated successfully",200)
    )
} );

const removeVideoFromPlaylist = asyncHandler( async (req,res) => {
    const {playlistId,videoId} = req.params;

    if ([playlistId, videoId].some(field => (field?.trim?.() ?? "") === "")) {
        throw new ApiError(404, "Playlist name or video ID is missing or empty");
    }
    const checkValidObjIdForVideoId = await isValidObjectId(videoId);
    const checkObjIdForPlayListId = await isValidObjectId(playlistId);
    if(checkValidObjIdForVideoId == false || checkObjIdForPlayListId == false){
        throw new ApiError(403,"Error: Invalid mongoose object id Error Location is: removeVideoFromPlaylist")
    }
    const playlist = await playlistModel.findById(new mongoose.Types.ObjectId(playlistId));
    if(!playlist){
        throw new ApiError(404,"Error: Playlist is not find")
    }
    const removeVideoFromPlayList = await playlistModel.findByIdAndUpdate(playlist._id,{
        $pull : {
            videos:videoId
        }
    },{new:true});

    if(!removeVideoFromPlayList){
        throw new ApiError(500,"Error: video remove from playlist is not successfullly tra again");
    }
    return res.json(
        new ApiResponse(removeVideoFromPlayList,true,"video removed from playlist operation is successfull",200)
    )
});

const addVideoToPlaylist = asyncHandler( async (req,res) => {
    const {videoId,playlistId} = req.params;

    if ([playlistId, videoId].some(field => (field?.trim?.() ?? "") === "")) {
        throw new ApiError(404, "Playlist name or video ID is missing or empty");
    }
    const checkValidObjIdForVideoId = await isValidObjectId(videoId);
    const checkObjIdForPlayListId = await isValidObjectId(playlistId);
    if(checkValidObjIdForVideoId == false || checkObjIdForPlayListId == false){
        throw new ApiError(403,"Error: Invalid mongoose object id Error Location is: addVideoToPlaylist")
    }

    const checkTheVideoAlreadyExistInPlaylist = await playlistModel.findOne({
        _id:new mongoose.Types.ObjectId(playlistId),
        videos:videoId
    });

    if(checkTheVideoAlreadyExistInPlaylist){
        throw new ApiError(409,"Error: video already exist in playlist")
    }

    const saveVideoInplaylist = await playlistModel.findByIdAndUpdate(new mongoose.Types.ObjectId(playlistId),{
        $addToSet : {
            videos:videoId
        }
    },{new:true});

    if(!saveVideoInplaylist){
        throw new ApiError(500,"Error:some thing wrong try again a few wminutes")

    }
    return res.json(
        new ApiResponse(saveVideoInplaylist,true,"video added successfully in playlist",200)
    )

} );

const getUserPlaylists = asyncHandler( async (req,res) => {
    const userId = req.user._id;
    const allPlaylists = await playlistModel.find({owner:new mongoose.Types.ObjectId(userId)});
    if(!allPlaylists){
        throw new ApiError(500,"Error: Server is busy")
    }
    return res.json(
        new ApiResponse(allPlaylists,true,"all playlist fetched succesfull",200)
    )
});

const getPlaylistById = asyncHandler( async (req,res) => {
    const {playlistId} = req.params;
    
    if(!playlistId){
        throw new ApiError(404,"Error: Playlistid is undefind");
    }
    const checkObjIdForPlayListId = await isValidObjectId(playlistId);
    if(checkObjIdForPlayListId == false){
        throw new ApiError(403,"Error: Invalid object id");
    }
    const playlist = await playlistModel.findOne({
        owner:req.user.id,
        _id:playlistId
    });
    if(!playlist){
        throw new ApiError(404,"Error: Playlist is not find")
    }

    return res.json(
        new ApiResponse(playlist,true,"Playlist is fetched",200)
    )
});

export {
    createPlaylist,
    removePlaylist,
    updatePlaylist,
    removeVideoFromPlaylist,
    addVideoToPlaylist,
    getUserPlaylists,
    getPlaylistById


}