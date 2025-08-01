import ApiError from "../utils/ApiError.js";
import UserModel from "../models/user.model.js";
import {uploadFile as uploadCloudinary} from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import { isValidObjectId } from "mongoose";
import jwt from "jsonwebtoken";
import subscriptionModel from "../models/subscription.model.js";
import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHanlder.js";

const genrateAccessTokenAndRefreshToken = async ( userId ) => {
    try {
        
        const user = await UserModel.findById(userId);
        
        if(!user) {
            throw new ApiError(404,"User Not Found");
        }
        const AccessToken = await user.genrateAccessToken();
        const RefreshToken = await user.genrateRefreshToken();


        user.refreshToken = RefreshToken;

        await user.save({validateBeforeSave:false})
        
        return { RefreshToken, AccessToken }; 

    } catch (error) {
        throw new ApiError(500,error.message || "Some Thing is wrong in genrateAccessTokenAndRefreshToken ");
    }
};

const registerUser = asyncHandler( async (req,res) => {
    // First Check Return Null Variables
    // Second Upload Images, Mean Avator is Compalsiry
    // Check User Exist Already
    // Hashed Password
    // User Creations
    // Throw Error With Using ApiError
    // Throw Response With Using ApiResponse
    // save cookies and creare json web token to create a square and power full token 


    const {username,fullname,password,email} = req.body;

    // check null fields
    if( [fullname,username,password,email].some( ( field ) => field.trim() == "" ) ){
        
        throw new ApiError(400,"All Fields Required");
    }
    // check User Exist whith Two Options Email Or Username
    const checkUserExistAlready = await UserModel.findOne({
        $or:[ {email:email} , {username:username} ]
    });


    if(checkUserExistAlready){
        throw new ApiError(409,"User Already Exist With User Name Or Email");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    
    if(req.files.coverImage && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        checkUserExistAlready = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar Field is Required");
    }

    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = await uploadCloudinary(coverImageLocalPath);
    

    if(!avatar){
        throw new ApiError(400,"Avatar is required");
    }

    // User Add In Db

    const user = await UserModel.create({
        fullname,
        username : username.toLowerCase(),
        email,
        password,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
    });

    const createdUser = await UserModel.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser){
        throw new ApiError(500,"Some Thing Wrong Sever Is Down Try After Some Times");
    }

    return res.status(201).json(
        new ApiResponse(createdUser,true,"User Successfully Created",200)
    );


});

const loginUser = asyncHandler( async (req,res) => {

    // Get Form Data
    // Validate Form Data
    // Check User with username Or Email
    // Check Hashed Password Match
    // Create AccessToken And Create Refresh Token
    // Add Refresh Token In Database
    // create Cookies For AccessToken And RefreshToken
    // And Last Return The User

    console.log( req.body)

    const {email,username,password} = req.body;
    

    if( !(email || username) ){
        throw new ApiError(400,"Email Or Username Is Required")
    }

    const checkUser = await UserModel.findOne({
        $or : [{email},{username}]
    });
    
    if(!checkUser){
        throw new ApiError(404,"User not Exist");
    }

    const checkHashedPasswordIsMatch = await checkUser.verifyThePassword(password);

    console.log( checkHashedPasswordIsMatch )

    if(!checkHashedPasswordIsMatch){
        throw new ApiError(401,"User Details Not Matched");
    }

    const {RefreshToken, AccessToken } = await genrateAccessTokenAndRefreshToken(checkUser._id);

    const loggedInUser = await UserModel.findOne({_id:checkUser._id}).select("-password -refreshToken");

    const cookiesOptions = {
        httpOnly:false,
        secure:true
    };

    return res.status(200)
    .cookie("accessToken",AccessToken,cookiesOptions)
    .cookie("refreshToken",RefreshToken,cookiesOptions)
    .json( new ApiError(loggedInUser,true,"User Successfully Logged In",200) )




} );



const logoutUser = asyncHandler( async (req,res) => {
    // First of All Get user Object
    // remove refreshToken For Db
    // save Db
    // And Last Is Remove all cookies For Web Page
    // Return Null || new ApiResponse(200);

    const UserDetails = req.user;

    const updateUserInfo = await UserModel.findByIdAndUpdate(UserDetails._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new: true
        }   
    );

    const cookiesOptions = {
        httpOnly:false,
        secure:true
    };

    return res.status(200)
    .clearCookie("accessToken",cookiesOptions)
    .clearCookie("refreshToken",cookiesOptions)
    .json( new ApiResponse(null,true,"User Logout Successfully",200) )
    


} );

const accessRefreshToken = asyncHandler( async (req,res) => {
    try {

        // check the refresh token
        // verify the refresh token
        // after verify the and check in database user exist
        // after match user refreshtoken and cookie refresh token
        // and after save and return cookies

        const accessToken = req.cookies?.refreshToken;

        if(!accessToken){
            throw new ApiError(401,"Not found AccessToken");
        }

        const decodToken = await jwt.verify(accessToken,process.env.REFRESH_TOKEN_SECRET);

        if(!decodToken){
            
            throw new ApiError(401,"Not Match The Access AccessToken");
        }

        const user = await UserModel.findById(decodToken._id);

        if(!user){
            throw new ApiError(404,"user not found in db");
        }

        // Check TokenIs Match
        if(user.refreshToken !== refreshToken){
            throw new apiError(402,"refresh token is not match")
        }

        const {RefreshToken, newAccessToken} = genrateAccessTokenAndRefreshToken(user._id);

        user.refreshToken = RefreshToken;

        await user.save({new:true});

        const Options = {
            httpOnly:true,
            secure:true,
        };
            
        return res.status(200)
        .cookie("accessToken",AccessToken,cookiesOptions)
        .cookie("refreshToken",RefreshToken,cookiesOptions)
        .json( new apiResponse({AccessToken:newAccessToken},true,"user refresh token is updated",200) );

        
    } catch (error) {
        throw new ApiError(401,error?.message || "error from accessRefreshToken Catch Hanlder")
    }
} );


const changeUserPassword = asyncHandler( async (req,res) => {

    const {oldPassword,newPassword} = req.body;

    const user = await UserModel.findById(req.user?._id);

    if(!user){
        throw new ApiError(404,"user not found");
    }

    const verifyThePassword = await user.verifyThePassword(oldPassword);
    
    if(!verifyThePassword){
        throw new ApiError(401,"old password is not match");
    }

    user.password = newPassword;

    await await user.save({validateBeforeSave:false});

    const updatedUser = await UserModel.findById(user._id).select("-watchHistory -password -refreshToken");

    return res.status(200)
    .json(new ApiResponse(updatedUser,true,"User Password Updated",200));



} );

const changeAccountDetails = asyncHandler( async (req,res) => {

    const {newEmail,newFullname} = req.body;
    
    if(!newEmail || !newFullname){
        throw new ApiError(402,"fullname ya email is required")
    } 
    
    const user = await UserModel.findByIdAndUpdate(req.user._id,{
        $set : {
            email : newEmail,
            fullname : newFullname
        }
    },{new:true}).select("-password -refreshToken");
    
    if(!user){
        throw new ApiError(500,"Error Somethin went wrong for change user Account detail save user");
    }

    return res.status(200)
    .json( new ApiResponse(user,true,"user account details updated successfully",200))

} );

const getCurrentUser = asyncHandler( async (req,res) => {
    console.log(req.referrer)
    return res.status(200)
    .json(new ApiResponse(req.user,true,"User Profile Data",200))

} );


const changeAvatarImage = asyncHandler( async (req,res) => {

    const avatarLocalPath = req.file?.path;
    
    if(!avatarLocalPath){
        throw new ApiError(402,"has a updating time avatar local path not found");
    }

    const upload = await uploadCloudinary(avatarLocalPath);

    if(!upload){
        return new ApiError(400,"avatar file uploading in cloudnairy not succesfull");
    }


    
    const user = await UserModel.findByIdAndUpdate(req.user?._id,{$set:{avatar:upload.url}},{new:true}).select("-password -refreshToken");


    if(!user){
        throw new ApiError(500,"User Avatar Image not updated")
    }

    return res.status(200)
    .json(new ApiResponse(user,true,"avatar image updated successfully",200))


});

const changeCoverImage = asyncHandler( async (req,res) => {

    const coverImageLocalPath = req.file?.path;
    
    if(!coverImageLocalPath){
        throw new ApiError(402,"has a updating time avatar local path not found");
    }

    const upload = await uploadCloudinary(coverImageLocalPath);

    if(!upload){
        return new ApiError(400,"avatar file uploading in cloudnairy not succesfull");
    }


    
    const user = await UserModel.findByIdAndUpdate(req.user?._id,{$set:{coverImage:upload.url}},{new:true}).select("-password -refreshToken");


    if(!user){
        throw new ApiError(500,"User Avatar Image not updated")
    }

    return res.status(200)
    .json(new ApiResponse(user,true,"avatar image updated successfully",200))


});

const getUserChannelProfile = asyncHandler( async (req,res) => {

    const {username} = req.params;

    if(!username){
        throw new ApiError(404,"channel not Found")
    }

    /* _id = channel,
        mean current User Subscriber
        _id = subscriber
        mean current user subscribed to anonther channel */

    const userChannel = await UserModel.aggregate([

        {
            $match : {
                username : username
            }
        },
        {
            $lookup : {
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as: "subscribers"
            }
        },
        {
            $lookup : {
                
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as: "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers",
                },

                channelSubscribeToCount:{
                    $size : "$subscribedTo"
                },

                toSubscribedChannel: {
                    $cond: {
                      if: { $in :  [new mongoose.Types.ObjectId(req.user?._id),"$subscribers.subscriber"]},
                      then: true,
                      else: false
                    }
                  }
                  
            }
        },
        {
            $project : {
                fullname:1,
                email:1,
                subscribers : 1,
                subscribedTo : 1,
                toSubscribedChannel : 1,
                subscribersCount : 1,
                subscribersCount : 1,
                username : 1,
                channelSubscribeToCount: 1,
            }
        }
    ]);

    if(!userChannel){
        throw new ApiError(404,"Channel Not Found");
    }

    return res.status(200)
    .json( new ApiResponse(userChannel,true,"channel data",200) )

} )

const getWatchHistory = asyncHandler( async (req,res) => {
    

   const watchHistory = await UserModel.aggregate(
        [
            {
                $match : {
                    $expr : {
                        $eq : ["$_id",req.user?._id]
                    }
                }
            },
            {
                $lookup : {
                    from : "videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory",
                    pipeline : [
                        {
                            $lookup : {
                                from: "users",
                                let : {ownerId:"$owner"},
                                pipeline : [
                                    {
                                        $match : {
                                            $expr : {
                                                $eq : ["$_id","$$ownerId"]
                                            }
                                        }
                                    },
                                    {
                                        $project : {
                                            fullname:1,
                                            email:1,
                                            username:1,
                                            avatar:1,
                                        }
                                    }
                                ],
                                as:"owner"
                            },
                            
                        },
                        {
                            $addFields : {
                               owner : { $first : "$owner"}
                            }
                        }
                        
                    ]
                }
            }
        ]
   )
    return res.status(200)
    .json( new ApiResponse(watchHistory[0].watchHistory,true,"watch History",200))


} );

const getAllNotification = asyncHandler( async (req,res) => {
    
    const notifications = await subscriptionModel.aggregate([
        {
          $match: {
            $expr: {
              $eq: ["$subscriber", new mongoose.Types.ObjectId(req.user.id)]
            }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "channel",
            foreignField: "_id",
            as: "channels",
            pipeline: [
              {
                $lookup: {
                  from: "videos",
                  let: { ownerId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $eq: ["$owner", "$$ownerId"]
                        }
                      }
                    },
                    {
                      $sort: { createdAt: -1 }
                    },
                    {
                      $limit: 1
                    }
                  ],
                  as: "notifications"
                }
              },
              {
                $addFields: {
                  notifications: { $first: "$notifications" }
                }
              }
            ]
          }
        },
        {
          $project: {
            channels: {
              $map: {
                input: "$channels",
                as: "channel",
                in: {
                  _id:"$$channel._id",
                  fullname: "$$channel.fullname",
                  avatar: "$$channel.avatar",
                  notifications: "$$channel.notifications",
                  
                }
              }
            }
          }
        }
    ]);
      
    
    return res.json(new ApiResponse(notifications,true,"All notifications",200))

})

export {
    registerUser,
    loginUser,
    logoutUser,
    accessRefreshToken,
    changeUserPassword,
    getCurrentUser,
    changeAvatarImage,
    changeCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    changeAccountDetails,
    getAllNotification

}