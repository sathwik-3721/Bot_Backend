import { appendDealerInfoToPDF, clearPDF } from '../utils/helper.js';

export async function appendDealerInfo(req, res) {
    try {
        // clear the pdf before appending the dealer info
        await clearPDF();
        
        // get the dealer and other info
        const { dealerName, dealerInfo, dealerNumber } = req.body;

        // call the function to append the dealer data into pdf
        await appendDealerInfoToPDF(dealerName, dealerInfo, dealerNumber);

        // return the success response
        return res.status(201).json({
            success: true,
            message: 'Dealer Information is stored successfully'
        })

    } catch(error) {
        console.error('Error occurred:', error.response?.data || error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error', 
            error: error.response?.data || error.message 
        });
    }
}