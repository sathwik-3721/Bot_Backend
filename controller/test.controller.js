export async function testConnection(req, res) {
    try {
        return res.status(200).json({ success: true, message: 'Hello'});
    } catch(err) {
        console.error('Error occurred:', err.response?.data || err.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error', 
            error: err.response?.data || err.message 
        });
    }
}