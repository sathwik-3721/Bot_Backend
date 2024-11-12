import { appendDealerInfo } from '../utils/helper.js';

export async function appendDealerInfo(req, res) {
    try {
        // get the dealer and other info
        const { dealerName, dealerInfo, dealerNumber } = req.body;

        // call the function to append the dealer data into pdf
        await appendDealerInfo(dealerName, dealerInfo, dealerNumber);

        // return the success response
        return res.status(201).json({
            success: true,
            message: 'Dealer Information is stored successfully'
        })

    } catch(error) {
        console.error('Error occurred:', err.response?.data || err.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error', 
            error: err.response?.data || err.message 
        });
    }
}